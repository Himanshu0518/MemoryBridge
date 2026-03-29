import { configureStore, createListenerMiddleware, type UnknownAction } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";

import { api } from "@/services/api";
import authReducer, {
  loginStart,
  loginSuccess,
  loginFailure,
  profileLoaded,
  clearAuth,
} from "./authSlice";
import type { User, AuthData } from "@/types";

// ─── RTK Query action shape (minimal, avoids importing internals) ─────────────
interface RtkQueryAction extends UnknownAction {
  meta?: { arg?: { endpointName?: string } };
  payload?: unknown;
}

function isMutationLifecycle(
  lifecycle: "pending" | "fulfilled" | "rejected",
  endpoint: string
) {
  return (action: UnknownAction): action is RtkQueryAction =>
    (action as RtkQueryAction).type === `api/executeMutation/${lifecycle}` &&
    (action as RtkQueryAction).meta?.arg?.endpointName === endpoint;
}

function isQueryLifecycle(
  lifecycle: "fulfilled" | "rejected",
  endpoint: string
) {
  return (action: UnknownAction): action is RtkQueryAction =>
    (action as RtkQueryAction).type === `api/executeQuery/${lifecycle}` &&
    (action as RtkQueryAction).meta?.arg?.endpointName === endpoint;
}

// ─── Listener middleware ───────────────────────────────────────────────────────
// Keeps authSlice in sync with RTK Query lifecycle events without creating
// a circular import between authSlice ↔ userApi ↔ api ↔ store.
const listenerMiddleware = createListenerMiddleware();
const startL = listenerMiddleware.startListening.bind(listenerMiddleware);

// login: pending → start
startL({
  predicate: isMutationLifecycle("pending", "login"),
  effect: (_, api) => {
    api.dispatch(loginStart());
  },
});

// login: fulfilled → persist token + partial user
startL({
  predicate: isMutationLifecycle("fulfilled", "login"),
  effect: (action, api) => {
    const data = (action as RtkQueryAction).payload as { data?: AuthData } | undefined;
    if (data?.data) api.dispatch(loginSuccess(data.data));
  },
});

// login: rejected → clear loading flag
startL({
  predicate: isMutationLifecycle("rejected", "login"),
  effect: (_, api) => {
    api.dispatch(loginFailure());
  },
});

// getMe: fulfilled → hydrate full profile
startL({
  predicate: isQueryLifecycle("fulfilled", "getMe"),
  effect: (action, api) => {
    const data = (action as RtkQueryAction).payload as { data?: User } | undefined;
    if (data?.data) api.dispatch(profileLoaded(data.data));
  },
});

// updateMe: fulfilled → sync profile in state
startL({
  predicate: isMutationLifecycle("fulfilled", "updateMe"),
  effect: (action, api) => {
    const data = (action as RtkQueryAction).payload as { data?: User } | undefined;
    if (data?.data) api.dispatch(profileLoaded(data.data));
  },
});

// logout: fulfilled → wipe auth state
startL({
  predicate: isMutationLifecycle("fulfilled", "logout"),
  effect: (_, api) => {
    api.dispatch(clearAuth());
  },
});

// deleteMe: fulfilled → wipe auth state
startL({
  predicate: isMutationLifecycle("fulfilled", "deleteMe"),
  effect: (_, api) => {
    api.dispatch(clearAuth());
  },
});

// ─── Store ────────────────────────────────────────────────────────────────────
export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      // listenerMiddleware must come before RTK Query middleware
      .prepend(listenerMiddleware.middleware)
      .concat(api.middleware),
});

// Enable refetchOnFocus / refetchOnReconnect behaviours
setupListeners(store.dispatch);

// ─── Inferred types ───────────────────────────────────────────────────────────
export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

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
import patientSessionReducer, {
  sessionStart,
  sessionOpened,
  sessionClosed,
  sessionLoadingFailed,
} from "./patientSessionSlice";
import type { User, AuthData, PatientSessionData } from "@/types";

// ─── RTK Query action helpers ─────────────────────────────────────────────────
interface RtkQueryAction extends UnknownAction {
  meta?:    { arg?: { endpointName?: string } };
  payload?: unknown;
}

function isMutationLifecycle(lifecycle: "pending" | "fulfilled" | "rejected", endpoint: string) {
  return (action: UnknownAction): action is RtkQueryAction =>
    (action as RtkQueryAction).type === `api/executeMutation/${lifecycle}` &&
    (action as RtkQueryAction).meta?.arg?.endpointName === endpoint;
}

function isQueryLifecycle(lifecycle: "fulfilled" | "rejected", endpoint: string) {
  return (action: UnknownAction): action is RtkQueryAction =>
    (action as RtkQueryAction).type === `api/executeQuery/${lifecycle}` &&
    (action as RtkQueryAction).meta?.arg?.endpointName === endpoint;
}

// ─── Listeners ────────────────────────────────────────────────────────────────
const listenerMiddleware = createListenerMiddleware();
const startL = listenerMiddleware.startListening.bind(listenerMiddleware);

// login
startL({ predicate: isMutationLifecycle("pending",   "login"), effect: (_, a) => a.dispatch(loginStart()) });
startL({
  predicate: isMutationLifecycle("fulfilled", "login"),
  effect: (action, a) => {
    const data = (action as RtkQueryAction).payload as { data?: AuthData } | undefined;
    if (data?.data) a.dispatch(loginSuccess(data.data));
  },
});
startL({ predicate: isMutationLifecycle("rejected",  "login"), effect: (_, a) => a.dispatch(loginFailure()) });

// getMe
startL({
  predicate: isQueryLifecycle("fulfilled", "getMe"),
  effect: (action, a) => {
    const data = (action as RtkQueryAction).payload as { data?: User } | undefined;
    if (data?.data) a.dispatch(profileLoaded(data.data));
  },
});

// updateMe
startL({
  predicate: isMutationLifecycle("fulfilled", "updateMe"),
  effect: (action, a) => {
    const data = (action as RtkQueryAction).payload as { data?: User } | undefined;
    if (data?.data) a.dispatch(profileLoaded(data.data));
  },
});

// logout / deleteMe
startL({ predicate: isMutationLifecycle("fulfilled", "logout"),   effect: (_, a) => a.dispatch(clearAuth()) });
startL({ predicate: isMutationLifecycle("fulfilled", "deleteMe"), effect: (_, a) => a.dispatch(clearAuth()) });

// patient session — start
startL({ predicate: isMutationLifecycle("pending",   "startPatientSession"), effect: (_, a) => a.dispatch(sessionStart()) });
startL({
  predicate: isMutationLifecycle("fulfilled", "startPatientSession"),
  effect: (action, a) => {
    const resp = (action as RtkQueryAction).payload as { data?: PatientSessionData } | undefined;
    if (resp?.data) {
      a.dispatch(sessionOpened({
        patientId:   resp.data.patient_id,
        patientName: resp.data.patient_name,
        token:       resp.data.patient_token,
      }));
    }
  },
});
startL({ predicate: isMutationLifecycle("rejected",  "startPatientSession"), effect: (_, a) => a.dispatch(sessionLoadingFailed()) });

// patient session — exit
startL({ predicate: isMutationLifecycle("fulfilled", "exitPatientSession"), effect: (_, a) => a.dispatch(sessionClosed()) });

// ─── Store ────────────────────────────────────────────────────────────────────
export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    auth:           authReducer,
    patientSession: patientSessionReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .prepend(listenerMiddleware.middleware)
      .concat(api.middleware),
});

setupListeners(store.dispatch);

export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

import type { RootState } from "./store";

// ─── Auth selectors ───────────────────────────────────────────────────────────
export const selectToken        = (state: RootState) => state.auth.token;
export const selectUser         = (state: RootState) => state.auth.user;
export const selectIsLoading    = (state: RootState) => state.auth.isLoading;
export const selectIsLoggedIn   = (state: RootState) => !!state.auth.token;

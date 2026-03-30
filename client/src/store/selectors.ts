import type { RootState } from "./store";

// ─── Auth selectors ───────────────────────────────────────────────────────────
export const selectToken        = (state: RootState) => state.auth.token;
export const selectRefreshToken = (state: RootState) => state.auth.refreshToken;
export const selectUserId       = (state: RootState) => state.auth.userId;
export const selectUser         = (state: RootState) => state.auth.user;
export const selectIsLoading    = (state: RootState) => state.auth.isLoading;
export const selectIsLoggedIn   = (state: RootState) => !!state.auth.token;

// ─── Patient session selectors ────────────────────────────────────────────────
export const selectPatientSession        = (state: RootState) => state.patientSession.session;
export const selectPatientSessionLoading = (state: RootState) => state.patientSession.isLoading;
export const selectIsInPatientMode       = (state: RootState) => !!state.patientSession.session;

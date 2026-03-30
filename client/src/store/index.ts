// Central barrel — import all store utilities from here
export { store } from "./store";
export type { RootState, AppDispatch } from "./store";

export { useAppDispatch, useAppSelector } from "./hooks";

export {
  selectToken,
  selectUser,
  selectIsLoading,
  selectIsLoggedIn,
} from "./selectors";

export {
  setToken,
  setUser,
  clearAuth,
  loginStart,
  loginSuccess,
  loginFailure,
  profileLoaded,
} from "./authSlice";

export {
  sessionStart,
  sessionOpened,
  sessionClosed,
  sessionLoadingFailed,
} from "./patientSessionSlice";

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User, AuthData } from "@/types";

// ─── State ────────────────────────────────────────────────────────────────────
interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
}

const initialState: AuthState = {
  // Rehydrate from localStorage so users stay logged in across hard refreshes.
  // The server's httpOnly cookie is the primary auth mechanism; this mirrors
  // the token in JS-accessible storage for use in request headers.
  token: localStorage.getItem("access-token"),
  user: null,
  isLoading: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const persistToken = (token: string) => localStorage.setItem("access-token", token);
const removeToken  = ()              => localStorage.removeItem("access-token");

// ─── Slice ────────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /** Call after OAuth redirect to manually hydrate the token */
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
      persistToken(action.payload);
    },

    /** Manually hydrate user profile (e.g. from a cached /me response) */
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },

    /** Wipe everything — dispatched on logout, deleteMe, or 401 */
    clearAuth(state) {
      state.token = null;
      state.user  = null;
      removeToken();
    },

    // ── Granular actions dispatched by LoginPage / components ─────────────
    loginStart(state) {
      state.isLoading = true;
    },

    loginSuccess(state, action: PayloadAction<AuthData>) {
      state.isLoading = false;
      const data = action.payload;
      const token = data["access-token"];
      state.token = token;
      persistToken(token);
      state.user = {
        id:    data.id,
        email: data.email,
        role:  data.role,
        name:  "",      // filled by the subsequent getMe call
        age:   null,
      };
    },

    loginFailure(state) {
      state.isLoading = false;
    },

    /** Call with the full User object returned by getMe */
    profileLoaded(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
  },
});

export const {
  setToken,
  setUser,
  clearAuth,
  loginStart,
  loginSuccess,
  loginFailure,
  profileLoaded,
} = authSlice.actions;

export default authSlice.reducer;

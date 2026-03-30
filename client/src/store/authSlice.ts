import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User, AuthData, RefreshData } from "@/types";

// ─── State ────────────────────────────────────────────────────────────────────
interface AuthState {
  token:        string | null;
  refreshToken: string | null;
  userId:       number | null;   // needed for /users/refresh payload
  user:         User   | null;
  isLoading:    boolean;
}

const initialState: AuthState = {
  token:        localStorage.getItem("access_token"),
  refreshToken: localStorage.getItem("refresh_token"),
  userId:       (() => {
    const id = localStorage.getItem("user_id");
    return id ? Number(id) : null;
  })(),
  user:      null,
  isLoading: false,
};

// ─── Storage helpers ──────────────────────────────────────────────────────────
const persistAuth = (data: AuthData) => {
  localStorage.setItem("access_token",  data.access_token);
  localStorage.setItem("refresh_token", data.refresh_token);
  localStorage.setItem("user_id",       String(data.id));
};

const persistTokens = (data: RefreshData) => {
  localStorage.setItem("access_token",  data.access_token);
  localStorage.setItem("refresh_token", data.refresh_token);
};

const removeAuth = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user_id");
  // Also clear patient mode on full logout
  localStorage.removeItem("patient_mode");
  localStorage.removeItem("patient_session");
};

// ─── Slice ────────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginStart(state) {
      state.isLoading = true;
    },

    loginSuccess(state, action: PayloadAction<AuthData>) {
      state.isLoading   = false;
      const data        = action.payload;
      state.token       = data.access_token;
      state.refreshToken = data.refresh_token;
      state.userId      = data.id;
      state.user        = { id: data.id, email: data.email, role: data.role, name: data.name, age: null };
      persistAuth(data);
    },

    loginFailure(state) {
      state.isLoading = false;
    },

    /** Called after a successful /users/refresh — rotates both tokens */
    tokensRefreshed(state, action: PayloadAction<RefreshData>) {
      state.token        = action.payload.access_token;
      state.refreshToken = action.payload.refresh_token;
      persistTokens(action.payload);
    },

    profileLoaded(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },

    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
      localStorage.setItem("access_token", action.payload);
    },

    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },

    clearAuth(state) {
      state.token        = null;
      state.refreshToken = null;
      state.userId       = null;
      state.user         = null;
      removeAuth();
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  tokensRefreshed,
  profileLoaded,
  setToken,
  setUser,
  clearAuth,
} = authSlice.actions;

export default authSlice.reducer;

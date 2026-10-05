import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User, AuthData, RefreshData } from "@/types";
import {
  setStorageItem,
  removeStorageItem,
  STORAGE_KEYS,
} from "@/lib/storage";

export interface AuthState {
  token: string | null;
  refreshToken: string | null;
  userId: number | null;
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
}

const initialState: AuthState = {
  token: null,
  refreshToken: null,
  userId: null,
  user: null,
  isLoading: false,
  isInitialized: false,
};

const persistAuth = (data: AuthData) => {
  setStorageItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
  setStorageItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
  setStorageItem(STORAGE_KEYS.USER_ID, String(data.id));
};

const persistTokens = (data: RefreshData) => {
  setStorageItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
  setStorageItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
};

const removeAuth = () => {
  removeStorageItem(STORAGE_KEYS.ACCESS_TOKEN);
  removeStorageItem(STORAGE_KEYS.REFRESH_TOKEN);
  removeStorageItem(STORAGE_KEYS.USER_ID);
  removeStorageItem(STORAGE_KEYS.PATIENT_MODE);
  removeStorageItem(STORAGE_KEYS.PATIENT_SESSION);
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginStart(state) {
      state.isLoading = true;
    },

    loginSuccess(state, action: PayloadAction<AuthData>) {
      state.isLoading = false;
      const data = action.payload;
      state.token = data.access_token;
      state.refreshToken = data.refresh_token;
      state.userId = data.id;
      state.user = { id: data.id, email: data.email, role: data.role, name: data.name, age: null };
      persistAuth(data);
    },

    loginFailure(state) {
      state.isLoading = false;
    },

    tokensRefreshed(state, action: PayloadAction<RefreshData>) {
      state.token = action.payload.access_token;
      state.refreshToken = action.payload.refresh_token;
      persistTokens(action.payload);
    },

    profileLoaded(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },

    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
      setStorageItem(STORAGE_KEYS.ACCESS_TOKEN, action.payload);
    },

    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },

    restoreAuth(
      state,
      action: PayloadAction<{
        token: string | null;
        refreshToken: string | null;
        userId: number | null;
        user?: User | null;
      }>
    ) {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.userId = action.payload.userId;
      if (action.payload.user) {
        state.user = action.payload.user;
      }
      state.isInitialized = true;
    },

    clearAuth(state) {
      state.token = null;
      state.refreshToken = null;
      state.userId = null;
      state.user = null;
      state.isLoading = false;
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
  restoreAuth,
  clearAuth,
} = authSlice.actions;

export default authSlice.reducer;

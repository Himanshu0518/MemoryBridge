import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { PatientSession } from "@/types";
import {
  setStorageItem,
  removeStorageItem,
  STORAGE_KEYS,
} from "@/lib/storage";

export interface PatientSessionState {
  session: PatientSession | null;
  isLoading: boolean;
  isInitialized: boolean;
}

const initialState: PatientSessionState = {
  session: null,
  isLoading: false,
  isInitialized: false,
};

const persistSession = (s: PatientSession) => {
  setStorageItem(STORAGE_KEYS.PATIENT_MODE, "true");
  setStorageItem(STORAGE_KEYS.PATIENT_SESSION, JSON.stringify(s));
};

const clearSessionStorage = () => {
  removeStorageItem(STORAGE_KEYS.PATIENT_MODE);
  removeStorageItem(STORAGE_KEYS.PATIENT_SESSION);
  removeStorageItem(STORAGE_KEYS.PATIENT_TOKEN);
};

export const patientSessionSlice = createSlice({
  name: "patientSession",
  initialState,
  reducers: {
    sessionStart(state) {
      state.isLoading = true;
    },

    sessionOpened(state, action: PayloadAction<PatientSession>) {
      state.isLoading = false;
      state.session = action.payload;
      persistSession(action.payload);
    },

    sessionClosed(state) {
      state.isLoading = false;
      state.session = null;
      clearSessionStorage();
    },

    sessionLoadingFailed(state) {
      state.isLoading = false;
    },

    restoreSession(state, action: PayloadAction<PatientSession | null>) {
      state.session = action.payload;
      state.isInitialized = true;
    },
  },
});

export const {
  sessionStart,
  sessionOpened,
  sessionClosed,
  sessionLoadingFailed,
  restoreSession,
} = patientSessionSlice.actions;

export default patientSessionSlice.reducer;

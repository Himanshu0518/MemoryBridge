import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { PatientSession } from "@/types";

interface PatientSessionState {
  session:   PatientSession | null;
  isLoading: boolean;
}

// ─── localStorage persistence ─────────────────────────────────────────────────
// Use localStorage (not sessionStorage) so the patient mode survives
// tab closes and app restarts — the device stays in patient mode
// until the caregiver explicitly exits.
function loadFromStorage(): PatientSession | null {
  try {
    const flag = localStorage.getItem("patient_mode");
    if (flag !== "true") return null;
    const raw  = localStorage.getItem("patient_session");
    return raw ? (JSON.parse(raw) as PatientSession) : null;
  } catch {
    return null;
  }
}

const persist = (s: PatientSession) => {
  localStorage.setItem("patient_mode",    "true");
  localStorage.setItem("patient_session", JSON.stringify(s));
};

const clearStorage = () => {
  localStorage.removeItem("patient_mode");
  localStorage.removeItem("patient_session");
};

// ─── Slice ────────────────────────────────────────────────────────────────────
const patientSessionSlice = createSlice({
  name: "patientSession",
  initialState: {
    session:   loadFromStorage(),
    isLoading: false,
  } as PatientSessionState,
  reducers: {
    sessionStart(state) {
      state.isLoading = true;
    },

    sessionOpened(state, action: PayloadAction<PatientSession>) {
      state.isLoading = false;
      state.session   = action.payload;
      persist(action.payload);
    },

    sessionClosed(state) {
      state.isLoading = false;
      state.session   = null;
      clearStorage();
    },

    sessionLoadingFailed(state) {
      state.isLoading = false;
    },
  },
});

export const {
  sessionStart,
  sessionOpened,
  sessionClosed,
  sessionLoadingFailed,
} = patientSessionSlice.actions;

export default patientSessionSlice.reducer;

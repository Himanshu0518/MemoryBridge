// ─── Patient session types ────────────────────────────────────────────────────

/** Returned by POST /auth/patient-session/:patient_id */
export interface PatientSessionData {
  patient_id: number;
  patient_name: string;
  patient_token: string;
  diagnosis_level: "mild" | "moderate" | "severe" | null;
}

/** Shape stored in Redux patientSession slice */
export interface PatientSession {
  patientId: number;
  patientName: string;
  token: string;
  diagnosisLevel: "mild" | "moderate" | "severe" | null;
}

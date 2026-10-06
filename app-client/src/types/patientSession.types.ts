export interface PatientSessionData {
  patient_id: number;
  patient_name: string;
  patient_token: string;
  diagnosis_level: "mild" | "moderate" | "severe" | null;
}

export interface PatientSession {
  patientId: number;
  patientName: string;
  token: string;
  diagnosisLevel: "mild" | "moderate" | "severe" | null;
}

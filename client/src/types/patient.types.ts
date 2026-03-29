// ─── Patient ──────────────────────────────────────────────────────────────────
// Mirrors server/schemas/patient.py → PatientResponse
export interface Patient {
  id: number;
  owner_id: number;
  name: string;
  age: number | null;
  diagnosis_level: "mild" | "moderate" | "severe" | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePatientPayload {
  name: string;
  age?: number;
  diagnosis_level?: "mild" | "moderate" | "severe";
}

export interface UpdatePatientPayload {
  name?: string;
  age?: number;
  diagnosis_level?: "mild" | "moderate" | "severe";
}

// ─── Person (known & unknown faces linked to a patient) ───────────────────────
// Mirrors server/schemas/patient.py → PersonResponse
export interface Person {
  id: number;
  patient_id: number;
  name: string | null;
  relation: string | null;
  is_known: boolean;
  first_seen: string;
  last_seen: string;
}

export interface CreatePersonPayload {
  name?: string;
  relation?: string;
  is_known: boolean;
}

export interface UpdatePersonPayload {
  name?: string;
  relation?: string;
  is_known?: boolean;
}

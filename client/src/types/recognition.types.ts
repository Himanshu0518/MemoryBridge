// ─── Store Known Face ─────────────────────────────────────────────────────────
// POST /recognition/store_known_face  (multipart/form-data)
export interface StoreFaceData {
  person_id: number;
  name: string;
  relation: string;
  is_known: boolean;
  embeddings_stored: number;
  embedding_ids: number[];
}

export interface StoreFaceResponse {
  success: boolean;
  message: string;
  data?: StoreFaceData;
}

// ─── Match Face ───────────────────────────────────────────────────────────────
// POST /recognition/match/{patient_id}  (multipart/form-data)
export interface MatchFaceRecognised {
  recognised: true;
  person_id: number;
  name: string;
  relation: string;
  similarity: number;
}

export interface MatchFaceUnknown {
  recognised: false;
  unknown_face_id?: number;
  error?: "no_face_detected";
}

export type MatchFaceData = MatchFaceRecognised | MatchFaceUnknown;

export interface MatchFaceResponse {
  success: boolean;
  message: string;
  data?: MatchFaceData;
}

// ─── Known Persons ────────────────────────────────────────────────────────────
// GET /recognition/known-persons/{patient_id}
export interface KnownPerson {
  id: number;
  name: string;
  relation: string;
}

export interface KnownPersonsResponse {
  success: boolean;
  message: string;
  data: KnownPerson[];
}

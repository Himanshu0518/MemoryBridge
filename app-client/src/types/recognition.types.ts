export interface StoreFaceData {
  person_id: number;
  name: string;
  relation: string;
  is_known: boolean;
  image_url?: string;
  embeddings_stored: number;
  embedding_ids: number[];
}

export interface StoreFaceResponse {
  success: boolean;
  message: string;
  data?: StoreFaceData;
}

export interface MatchFaceRecognised {
  recognised: true;
  person_id: number;
  name: string;
  relation: string;
  is_family: boolean;
  similarity: number;
  image_url?: string;
}

export interface MatchFaceUnknown {
  recognised: false;
  unknown_face_id?: number;
  image_url?: string;
  error?: "no_face_detected";
}

export type MatchFaceData = MatchFaceRecognised | MatchFaceUnknown;

export interface MatchFaceResponse {
  success: boolean;
  message: string;
  data?: MatchFaceData;
}

export interface KnownPerson {
  id: number;
  name: string;
  relation: string;
  image_url?: string;
}

export interface KnownPersonsResponse {
  success: boolean;
  message: string;
  data: KnownPerson[];
}

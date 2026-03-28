// ─── Generic API Response wrapper ────────────────────────────────────────────
// Matches server/core/api_response.py → ApiResponse shape
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

// ─── User ─────────────────────────────────────────────────────────────────────
// Mirrors server/schemas/user.py → UserResponse
export interface User {
  id: number;
  name: string;
  email: string;
  age: number | null;
  role: string;
}

// ─── Auth data returned on login ──────────────────────────────────────────────
export interface AuthData {
  id: number;
  email: string;
  role: string;
  /** JWT — also stored in httpOnly cookie by server */
  "access-token": string;
}

// ─── Signup data returned on register ────────────────────────────────────────
export interface SignupData {
  id: number;
  name: string;
  email: string;
}

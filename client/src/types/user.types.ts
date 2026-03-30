// ─── Generic API Response wrapper ────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

// ─── User ─────────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  name: string;
  email: string;
  age: number | null;
  role: string;
}

// ─── Auth data returned on login ──────────────────────────────────────────────
export interface AuthData {
  id:            number;
  name:          string;
  email:         string;
  role:          string;
  access_token:  string;
  refresh_token: string;
}

// ─── Token refresh response ───────────────────────────────────────────────────
export interface RefreshData {
  access_token:  string;
  refresh_token: string;
}

// ─── Signup data returned on register ────────────────────────────────────────
export interface SignupData {
  id:    number;
  name:  string;
  email: string;
}

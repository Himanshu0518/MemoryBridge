// ─── Request payloads ─────────────────────────────────────────────────────────
// These match server/schemas/user.py exactly (snake_case to match FastAPI)

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  name?: string;
  age?: number;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_new_password: string;
}

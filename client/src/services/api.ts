import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";

// ─── Base URL ─────────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

// ─── Minimal type for the slice of state we need ──────────────────────────────
// We define this inline to break the circular dependency:
//   store.ts → api.ts → store.ts (circular)
// By typing getState() as a minimal shape instead of importing RootState,
// the cycle is broken. store.ts remains the single source of RootState truth.
interface StateWithAuth {
  auth: { token: string | null };
}

// ─── Raw base query ───────────────────────────────────────────────────────────
const rawBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  // Include httpOnly cookies on every request (set by server on login)
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as StateWithAuth).auth.token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

// ─── Custom base query with centralised error handling ────────────────────────
const baseQueryWithErrorHandling: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error) {
    const { status } = result.error;
    if (status === 401) {
      // Token expired — dispatch clearAuth so the UI reacts immediately.
      // Import is done lazily to keep the circular dep broken at module level.
      const { clearAuth } = await import("@/store/authSlice");
      api.dispatch(clearAuth());
    }
    console.error(`[API Error] status=${status}`, result.error.data);
  }

  return result;
};

// ─── Root API instance ────────────────────────────────────────────────────────
// All feature APIs inject their endpoints into this single instance
// so they share one cache, one set of tags, and one middleware entry.
export const api = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithErrorHandling,
  tagTypes: ["User"],
  endpoints: () => ({}),
});

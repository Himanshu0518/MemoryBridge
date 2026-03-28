import { api } from "./api";
import type {
  ApiResponse,
  User,
  AuthData,
  SignupData,
  SignupPayload,
  LoginPayload,
  UpdateProfilePayload,
  ChangePasswordPayload,
} from "@/types";

// ─── User API — injected into the root api instance ───────────────────────────
export const userApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // ── POST /users/signup ──────────────────────────────────────────────────
    signup: builder.mutation<ApiResponse<SignupData>, SignupPayload>({
      query: (payload) => ({
        url: "/users/signup",
        method: "POST",
        body: payload,
      }),
    }),

    // ── POST /users/login ───────────────────────────────────────────────────
    login: builder.mutation<ApiResponse<AuthData>, LoginPayload>({
      query: (payload) => ({
        url: "/users/login",
        method: "POST",
        body: payload,
      }),
      // After login, invalidate the cached "User" tag so /me refetches
      invalidatesTags: ["User"],
    }),

    // ── POST /users/logout ──────────────────────────────────────────────────
    logout: builder.mutation<ApiResponse<undefined>, void>({
      query: () => ({
        url: "/users/logout",
        method: "POST",
      }),
      // Clear user cache on logout
      invalidatesTags: ["User"],
    }),

    // ── GET /users/me ───────────────────────────────────────────────────────
    getMe: builder.query<ApiResponse<User>, void>({
      query: () => "/users/me",
      providesTags: ["User"],
    }),

    // ── PATCH /users/me ─────────────────────────────────────────────────────
    updateMe: builder.mutation<ApiResponse<User>, UpdateProfilePayload>({
      query: (payload) => ({
        url: "/users/me",
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: ["User"],
    }),

    // ── PATCH /users/me/change-password ─────────────────────────────────────
    changePassword: builder.mutation<ApiResponse<undefined>, ChangePasswordPayload>({
      query: (payload) => ({
        url: "/users/me/change-password",
        method: "PATCH",
        body: payload,
      }),
    }),

    // ── DELETE /users/me ─────────────────────────────────────────────────────
    deleteMe: builder.mutation<ApiResponse<undefined>, void>({
      query: () => ({
        url: "/users/me",
        method: "DELETE",
      }),
      invalidatesTags: ["User"],
    }),
  }),

  // Raise an error if an endpoint is accidentally duplicated
  overrideExisting: false,
});

// ─── Auto-generated hooks ──────────────────────────────────────────────────────
export const {
  useSignupMutation,
  useLoginMutation,
  useLogoutMutation,
  useGetMeQuery,
  useUpdateMeMutation,
  useChangePasswordMutation,
  useDeleteMeMutation,
} = userApi;

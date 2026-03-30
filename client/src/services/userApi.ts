import { api } from "./api";
import type {
  ApiResponse,
  User,
  AuthData,
  RefreshData,
  SignupData,
  SignupPayload,
  LoginPayload,
  UpdateProfilePayload,
  ChangePasswordPayload,
} from "@/types";

export const userApi = api.injectEndpoints({
  endpoints: (builder) => ({
    signup: builder.mutation<ApiResponse<SignupData>, SignupPayload>({
      query: (payload) => ({ url: "/users/signup", method: "POST", body: payload }),
    }),

    login: builder.mutation<ApiResponse<AuthData>, LoginPayload>({
      query: (payload) => ({ url: "/users/login", method: "POST", body: payload }),
      invalidatesTags: ["User"],
    }),

    logout: builder.mutation<ApiResponse<undefined>, void>({
      query: () => ({ url: "/users/logout", method: "POST" }),
      invalidatesTags: ["User"],
    }),

    /** Silent token refresh — called automatically by api.ts on 401 */
    refreshToken: builder.mutation<
      ApiResponse<RefreshData>,
      { user_id: number; refresh_token: string }
    >({
      query: (payload) => ({ url: "/users/refresh", method: "POST", body: payload }),
    }),

    /**
     * Logout guard: verify the caregiver owns the patient before allowing exit.
     * No token required — intentionally unauthenticated endpoint.
     */
    verifyCaregiver: builder.mutation<
      ApiResponse<undefined>,
      { email: string; password: string; patient_id: number }
    >({
      query: (payload) => ({ url: "/users/verify-caregiver", method: "POST", body: payload }),
    }),

    getMe: builder.query<ApiResponse<User>, void>({
      query: () => "/users/me",
      providesTags: ["User"],
    }),

    updateMe: builder.mutation<ApiResponse<User>, UpdateProfilePayload>({
      query: (payload) => ({ url: "/users/me", method: "PATCH", body: payload }),
      invalidatesTags: ["User"],
    }),

    changePassword: builder.mutation<ApiResponse<undefined>, ChangePasswordPayload>({
      query: (payload) => ({ url: "/users/me/change-password", method: "PATCH", body: payload }),
    }),

    deleteMe: builder.mutation<ApiResponse<undefined>, void>({
      query: () => ({ url: "/users/me", method: "DELETE" }),
      invalidatesTags: ["User"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useSignupMutation,
  useLoginMutation,
  useLogoutMutation,
  useRefreshTokenMutation,
  useVerifyCaregiverMutation,
  useGetMeQuery,
  useUpdateMeMutation,
  useChangePasswordMutation,
  useDeleteMeMutation,
} = userApi;

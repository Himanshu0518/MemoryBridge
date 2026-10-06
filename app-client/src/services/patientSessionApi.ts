import { api } from "./api";
import type { ApiResponse, PatientSessionData } from "@/types";

export const patientSessionApi = api.injectEndpoints({
  endpoints: (builder) => ({
    startPatientSession: builder.mutation<ApiResponse<PatientSessionData>, number>({
      query: (patientId) => ({
        url: `/auth/patient-session/${patientId}`,
        method: "POST",
      }),
    }),

    exitPatientSession: builder.mutation<ApiResponse<undefined>, void>({
      query: () => ({
        url: "/auth/patient-session/exit",
        method: "POST",
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useStartPatientSessionMutation,
  useExitPatientSessionMutation,
} = patientSessionApi;

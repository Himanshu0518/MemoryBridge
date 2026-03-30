import { api } from "./api";
import type { ApiResponse, PatientSessionData } from "@/types";

export const patientSessionApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // ── POST /auth/patient-session/:patientId ───────────────────────────────
    // Caregiver calls this to get a patient-scoped token.
    startPatientSession: builder.mutation<ApiResponse<PatientSessionData>, number>({
      query: (patientId) => ({
        url: `/auth/patient-session/${patientId}`,
        method: "POST",
      }),
    }),

    // ── POST /auth/patient-session/exit ────────────────────────────────────
    // Clears the patient-token cookie server-side.
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

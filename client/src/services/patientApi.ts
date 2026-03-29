import { api } from "./api";
import type { ApiResponse, Patient, Person, CreatePatientPayload, UpdatePatientPayload, CreatePersonPayload, UpdatePersonPayload } from "@/types";

export const patientApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // ── GET /patients ───────────────────────────────────────────────────────
    getPatients: builder.query<ApiResponse<Patient[]>, void>({
      query: () => "/patients",
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: "Patient" as const, id })),
              { type: "Patient", id: "LIST" },
            ]
          : [{ type: "Patient", id: "LIST" }],
    }),

    // ── GET /patients/:id ───────────────────────────────────────────────────
    getPatient: builder.query<ApiResponse<Patient>, number>({
      query: (id) => `/patients/${id}`,
      providesTags: (_result, _err, id) => [{ type: "Patient", id }],
    }),

    // ── POST /patients ──────────────────────────────────────────────────────
    createPatient: builder.mutation<ApiResponse<Patient>, CreatePatientPayload>({
      query: (payload) => ({
        url: "/patients",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: [{ type: "Patient", id: "LIST" }],
    }),

    // ── PATCH /patients/:id ─────────────────────────────────────────────────
    updatePatient: builder.mutation<
      ApiResponse<Patient>,
      { id: number; payload: UpdatePatientPayload }
    >({
      query: ({ id, payload }) => ({
        url: `/patients/${id}`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: (_result, _err, { id }) => [{ type: "Patient", id }],
    }),

    // ── DELETE /patients/:id ────────────────────────────────────────────────
    deletePatient: builder.mutation<ApiResponse<undefined>, number>({
      query: (id) => ({ url: `/patients/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Patient", id: "LIST" }],
    }),

    // ── GET /patients/:patientId/persons ────────────────────────────────────
    getPersons: builder.query<ApiResponse<Person[]>, number>({
      query: (patientId) => `/patients/${patientId}/persons`,
      providesTags: (result, _err, patientId) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: "Person" as const, id })),
              { type: "Person", id: `LIST-${patientId}` },
            ]
          : [{ type: "Person", id: `LIST-${patientId}` }],
    }),

    // ── POST /patients/:patientId/persons ───────────────────────────────────
    createPerson: builder.mutation<
      ApiResponse<Person>,
      { patientId: number; payload: CreatePersonPayload }
    >({
      query: ({ patientId, payload }) => ({
        url: `/patients/${patientId}/persons`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: (_result, _err, { patientId }) => [
        { type: "Person", id: `LIST-${patientId}` },
      ],
    }),

    // ── PATCH /patients/:patientId/persons/:personId ────────────────────────
    updatePerson: builder.mutation<
      ApiResponse<Person>,
      { patientId: number; personId: number; payload: UpdatePersonPayload }
    >({
      query: ({ patientId, personId, payload }) => ({
        url: `/patients/${patientId}/persons/${personId}`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: (_result, _err, { patientId, personId }) => [
        { type: "Person", id: personId },
        { type: "Person", id: `LIST-${patientId}` },
        { type: "Recognition", id: `KNOWN-${patientId}` },
      ],
    }),

    // ── DELETE /patients/:patientId/persons/:personId ───────────────────────
    deletePerson: builder.mutation<
      ApiResponse<undefined>,
      { patientId: number; personId: number }
    >({
      query: ({ patientId, personId }) => ({
        url: `/patients/${patientId}/persons/${personId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _err, { patientId, personId }) => [
        { type: "Person", id: personId },
        { type: "Person", id: `LIST-${patientId}` },
        { type: "Recognition", id: `KNOWN-${patientId}` },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPatientsQuery,
  useGetPatientQuery,
  useCreatePatientMutation,
  useUpdatePatientMutation,
  useDeletePatientMutation,
  useGetPersonsQuery,
  useCreatePersonMutation,
  useUpdatePersonMutation,
  useDeletePersonMutation,
} = patientApi;

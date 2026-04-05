import { api } from "./api";
import type { ApiResponse, ConversationRecord, PersonConversationsData } from "@/types";

export const transcriptionApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // GET /transcription/conversations/:patientId  — all for a patient
    getConversations: builder.query<ApiResponse<ConversationRecord[]>, number>({
      query: (patientId) => `/transcription/conversations/${patientId}`,
      providesTags: (_r, _e, patientId) => [
        { type: "Conversation" as const, id: `LIST-${patientId}` },
      ],
    }),

    // GET /transcription/conversations/:patientId/:conversationId
    getConversation: builder.query<
      ApiResponse<ConversationRecord>,
      { patientId: number; conversationId: number }
    >({
      query: ({ patientId, conversationId }) =>
        `/transcription/conversations/${patientId}/${conversationId}`,
      providesTags: (_r, _e, { conversationId }) => [
        { type: "Conversation" as const, id: conversationId },
      ],
    }),

    // GET /transcription/person/:personId/conversations  ← KEY endpoint
    // Called after face recognition succeeds — surfaces past convos with that person
    getConversationsForPerson: builder.query<
      ApiResponse<PersonConversationsData>,
      number
    >({
      query: (personId) => `/transcription/person/${personId}/conversations`,
      providesTags: (_r, _e, personId) => [
        { type: "Conversation" as const, id: `PERSON-${personId}` },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetConversationsQuery,
  useGetConversationQuery,
  useGetConversationsForPersonQuery,
} = transcriptionApi;

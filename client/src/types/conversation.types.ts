// ─── Conversation history types ───────────────────────────────────────────────

export interface ConversationTranscript {
  id:        number;
  text:      string;
  timestamp: string;
}

export interface ConversationPerson {
  id:       number;
  name:     string | null;
  relation: string | null;
  is_known: boolean;
}

export interface ConversationRecord {
  id:          number;
  patient_id:  number;
  person_id:   number | null;
  person:      ConversationPerson | null;  // ← enriched person context
  started_at:  string;
  ended_at:    string | null;
  summary:     string | null;
  transcripts: ConversationTranscript[];
}

export interface PersonConversationsData {
  person:        ConversationPerson;
  conversations: ConversationRecord[];
}

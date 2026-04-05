// ─── Transcription / Socket.IO types ─────────────────────────────────────────

export type TranscriptionStatus =
  | "idle"          // not started
  | "connecting"    // socket connecting / waiting for server ack
  | "active"        // recording & receiving transcripts
  | "stopping"      // sent stop, waiting for final summary
  | "stopped"       // session ended cleanly
  | "error";        // something went wrong

export interface TranscriptLine {
  id:        string;   // client-generated UUID for React keys
  text:      string;
  timestamp: Date;
}

export interface ConversationSummary {
  conversationId: number;
  summary:        string;
}

// Socket.IO server → client event payloads
export interface TranscriptionStartedPayload {
  conversation_id: number;
}

export interface TranscriptLinePayload {
  text: string;
}

export interface SummaryUpdatePayload {
  summary: string;
}

export interface TranscriptionStoppedPayload {
  conversation_id: number;
  summary:         string;
}

export interface TranscriptionErrorPayload {
  message: string;
}

// REST — conversation history
export interface ConversationRecord {
  id:          number;
  patient_id:  number;
  started_at:  string;
  ended_at:    string | null;
  summary:     string | null;
  transcripts: { id: number; text: string; timestamp: string }[];
}

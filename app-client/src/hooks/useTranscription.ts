/**
 * useTranscription.ts
 * ====================
 * React Native adaptation of the web client's Deepgram live transcription hook.
 *
 * Architecture:
 *   1. The mic is opened with @siteed/expo-audio-studio which emits PCM chunks
 *      via the `onAudioStream` callback (base64 on native, Float32Array on web).
 *   2. Chunks are converted to binary and streamed over a WebSocket to Deepgram
 *      (same `nova-2` config as the web client).
 *   3. Each final transcript sentence is:
 *      a) shown instantly in the UI
 *      b) POST-ed to /transcription/transcript-line  (saves to DB in real time)
 *   4. On stop, the full transcript is POST-ed to /transcription/finish
 *      which calls Gemini, saves the summary, closes the conversation.
 *
 * autoStart:
 *   When true (set by Patient Mode when a face is recognised), the hook restarts
 *   automatically whenever personId changes.
 */

import { useState, useRef, useEffect, useCallback } from "react";

let useAudioRecorder: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useAudioRecorder = require("@siteed/expo-audio-studio")?.useAudioRecorder;
} catch {
  // Native module not linked (e.g. Expo Go)
}
import {
  useStartConversationMutation,
  useSaveTranscriptLineMutation,
  useFinishConversationMutation,
} from "@/services/transcriptionApi";

const DEEPGRAM_API_KEY = process.env.EXPO_PUBLIC_DEEPGRAM_API_KEY ?? "";

// Deepgram real-time streaming WebSocket URL (same params as the web client)
const DEEPGRAM_WS_URL = "wss://api.deepgram.com/v1/listen";

export interface TranscriptLine {
  id: number;
  text: string;
  is_final: boolean;
  timestamp: string;
}

export interface UseTranscriptionOptions {
  /**
   * If true, recording starts automatically whenever personId changes
   * to a non-null value (i.e. a face was just recognised).
   */
  autoStart?: boolean;
}

/** Decode a base64 string into a Uint8Array (works in RN's JS engine). */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function useTranscription(
  patientId: number,
  patientName: string,
  personId?: number | null,
  options?: UseTranscriptionOptions
) {
  const autoStart = options?.autoStart ?? false;

  const [isRecordingState, setIsRecordingState] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs — survive re-renders without triggering effects
  const wsRef = useRef<WebSocket | null>(null);
  const conversationIdRef = useRef<number | null>(null);
  const transcriptLinesRef = useRef<string[]>([]);
  const lineIdRef = useRef(0);
  const activePersonIdRef = useRef<number | null | undefined>(undefined);
  const stoppingRef = useRef(false);

  // RTK Query mutations
  const [startConversation] = useStartConversationMutation();
  const [saveTranscriptLine] = useSaveTranscriptLineMutation();
  const [finishConversation] = useFinishConversationMutation();

  // ── Audio recorder (streams PCM chunks) ────────────────────────────────────
  // onAudioStream is provided per-session in the startRecording config below;
  // it forwards chunks to the handler currently registered in chunkHandlerRef.
  const chunkHandlerRef = useRef<((data: Uint8Array) => void) | null>(null);

  const dummyRecorder = useRef({
    isRecording: false,
    startRecording: async () => {
      throw new Error("Native audio recorder module is not available in this environment.");
    },
    stopRecording: async () => {},
  }).current;

  const recorder = useAudioRecorder ? useAudioRecorder() : dummyRecorder;

  // ── Internal hardware stop (no state reset) ────────────────────────────────
  const _stopHardware = useCallback(async () => {
    chunkHandlerRef.current = null;
    try {
      if (recorder.isRecording) {
        await recorder.stopRecording();
      }
    } catch {
      /* ignore */
    }
    try {
      if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) {
        wsRef.current.close();
      }
    } catch {
      /* ignore */
    }
    wsRef.current = null;
  }, [recorder]);

  // ── Stop ───────────────────────────────────────────────────────────────────
  const stopRecording = useCallback(async () => {
    stoppingRef.current = true;
    await _stopHardware();
    setIsRecordingState(false);
    activePersonIdRef.current = undefined;

    const cid = conversationIdRef.current;
    const fullText = transcriptLinesRef.current.join(" ");

    if (!cid || !fullText.trim()) {
      stoppingRef.current = false;
      return;
    }

    try {
      const res = await finishConversation({
        conversation_id: cid,
        patient_name: patientName,
        full_transcript: fullText,
      }).unwrap();
      setSummary(res.data?.summary ?? "");
    } catch (err) {
      console.error("Failed to finish conversation:", err);
    } finally {
      stoppingRef.current = false;
    }
  }, [_stopHardware, finishConversation, patientName]);

  // ── Start ──────────────────────────────────────────────────────────────────
  const startRecording = useCallback(
    async (overridePersonId?: number | null) => {
      setError(null);
      setTranscripts([]);
      setSummary("");
      transcriptLinesRef.current = [];
      lineIdRef.current = 0;
      conversationIdRef.current = null;

      const resolvedPersonId =
        overridePersonId !== undefined ? overridePersonId : (personId ?? null);

      if (!DEEPGRAM_API_KEY) {
        setError("Deepgram API key missing. Add EXPO_PUBLIC_DEEPGRAM_API_KEY to .env");
        return;
      }

      try {
        // 1. Create conversation row in backend DB
        const convRes = await startConversation({
          patient_id: patientId,
          patient_name: patientName,
          person_id: resolvedPersonId,
        }).unwrap();

        const cid = convRes.data?.conversation_id;
        if (!cid) throw new Error("Backend did not return conversation_id");
        conversationIdRef.current = cid;
        setConversationId(cid);

        // 2. Open Deepgram WebSocket (token auth via subprotocol, as on web)
        const params = new URLSearchParams({
          model: "nova-2",
          language: "en-US",
          smart_format: "true",
          interim_results: "false",
          endpointing: "400",
          // PCM 16-bit mono @ 16 kHz — matches the recorder config below
          encoding: "linear16",
          sample_rate: "16000",
          channels: "1",
        });
        const ws = new WebSocket(`${DEEPGRAM_WS_URL}?${params.toString()}`, [
          "token",
          DEEPGRAM_API_KEY,
        ]);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(String(event.data));
            if (data.type !== "Results") return;

            const sentence: string = data?.channel?.alternatives?.[0]?.transcript ?? "";
            if (!sentence.trim() || !data.is_final) return;

            // Show immediately in UI
            setTranscripts((prev) => [
              ...prev,
              {
                id: ++lineIdRef.current,
                text: sentence,
                is_final: true,
                timestamp: new Date().toISOString(),
              },
            ]);

            // Buffer for summary on stop
            transcriptLinesRef.current.push(sentence);

            // Persist to backend (fire-and-forget but capture summary)
            const cidNow = conversationIdRef.current;
            if (cidNow) {
              saveTranscriptLine({ conversation_id: cidNow, text: sentence })
                .unwrap()
                .then((res: { data?: { summary?: string } }) => {
                  if (res.data?.summary) {
                    setSummary(res.data.summary);
                  }
                })
                .catch((err: unknown) =>
                  console.error("Failed to save transcript line:", err)
                );
            }
          } catch (parseErr) {
            console.warn("Failed to parse Deepgram message:", parseErr);
          }
        };

        ws.onerror = () => {
          setError("Deepgram connection error. Check your API key and network.");
        };

        // 3. Wait for socket to open before streaming audio
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("Deepgram connection timeout")), 10000);
          ws.onopen = () => {
            clearTimeout(timer);
            resolve();
          };
          ws.onerror = () => {
            clearTimeout(timer);
            reject(new Error("Deepgram connection error"));
          };
        });

        // 4. Register chunk handler, then start the native recorder
        chunkHandlerRef.current = (data: Uint8Array) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
          }
        };

        await recorder.startRecording({
          interval: 250, // 250ms chunks — matches the web client
          sampleRate: 16000,
          encoding: "pcm_16bit",
          channels: 1,
          onAudioStream: async (event: { data: string | Float32Array | Int16Array }) => {
            const handler = chunkHandlerRef.current;
            if (!handler) return;
            if (typeof event.data === "string") {
              handler(base64ToUint8Array(event.data));
            } else if (event.data instanceof Uint8Array) {
              handler(event.data);
            } else if (event.data instanceof Float32Array) {
              const pcm = new Int16Array(event.data.length);
              for (let i = 0; i < event.data.length; i++) {
                const s = Math.max(-1, Math.min(1, event.data[i]));
                pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
              }
              handler(new Uint8Array(pcm.buffer));
            } else if (event.data instanceof Int16Array) {
              handler(new Uint8Array(event.data.buffer));
            }
          },
        });

        activePersonIdRef.current = resolvedPersonId;
        setIsRecordingState(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to start recording.";
        setError(msg);
        setIsRecordingState(false);
        await _stopHardware();
      }
    },
    [patientId, patientName, personId, startConversation, saveTranscriptLine, _stopHardware, recorder]
  );

  // ── Auto-start / restart when personId changes ─────────────────────────────
  useEffect(() => {
    if (!autoStart) return;
    if (personId === undefined) return;
    if (activePersonIdRef.current === personId && isRecordingState) return;

    const restart = async () => {
      if (recorder.isRecording || wsRef.current) {
        await _stopHardware();
        await new Promise((r) => setTimeout(r, 300)); // let WS close cleanly
      }
      await startRecording(personId);
    };
    restart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, personId]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      _stopHardware();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isRecording: isRecordingState || recorder.isRecording,
    transcripts,
    summary,
    conversationId,
    error,
    startRecording,
    stopRecording,
  };
}

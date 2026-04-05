import { useState, useRef, useEffect, useCallback } from "react";
import { socket } from "@/services/socket";

export interface TranscriptLine {
  id:        number;
  text:      string;
  is_final:  boolean;
  timestamp: string;
}

export function useTranscription(
  patientId:   number,
  patientName: string,
  personId?:   number | null,   // ← link conversation to recognised person
) {
  const [isRecording,    setIsRecording]    = useState(false);
  const [transcripts,    setTranscripts]    = useState<TranscriptLine[]>([]);
  const [summary,        setSummary]        = useState<string>("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [error,          setError]          = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);
  const lineIdRef        = useRef(0);

  // ── Stop ──────────────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current        = null;
    mediaRecorderRef.current = null;
    socket.emit("stop_transcription");
    setIsRecording(false);
  }, []);

  // ── Start ─────────────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    setError(null);
    setTranscripts([]);
    setSummary("");
    lineIdRef.current = 0;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "";

      const mediaRecorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0 && socket.connected) {
          socket.emit("audio_data", e.data);
        }
      };

      mediaRecorder.start(250);   // 250 ms chunks

      if (!socket.connected) socket.connect();

      socket.emit("start_transcription", {
        patient_id:   patientId,
        patient_name: patientName,
        person_id:    personId ?? null,   // pass recognised person or null
      });

      setIsRecording(true);
    } catch {
      setError("Microphone access denied. Please allow microphone permissions and try again.");
      setIsRecording(false);
    }
  }, [patientId, patientName, personId]);

  // ── Socket listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    function onStarted(data: { conversation_id: number; person_id: number | null }) {
      setConversationId(data.conversation_id);
    }

    function onTranscriptLine(data: { text: string }) {
      setTranscripts((prev) => [
        ...prev,
        {
          id:        ++lineIdRef.current,
          text:      data.text,
          is_final:  true,
          timestamp: new Date().toISOString(),
        },
      ]);
    }

    function onSummaryUpdate(data: { summary: string }) {
      setSummary(data.summary);
    }

    function onStopped(data: { conversation_id: number; summary: string }) {
      setSummary(data.summary);
      setConversationId(data.conversation_id);
      setIsRecording(false);
    }

    function onError(data: { message: string }) {
      setError(data.message ?? "An error occurred during transcription.");
      setIsRecording(false);
    }

    socket.on("transcription_started", onStarted);
    socket.on("transcript_line",       onTranscriptLine);
    socket.on("summary_update",        onSummaryUpdate);
    socket.on("transcription_stopped", onStopped);
    socket.on("transcription_error",   onError);

    return () => {
      socket.off("transcription_started", onStarted);
      socket.off("transcript_line",       onTranscriptLine);
      socket.off("summary_update",        onSummaryUpdate);
      socket.off("transcription_stopped", onStopped);
      socket.off("transcription_error",   onError);
    };
  }, []);

  // Ensure socket is connected; stop on unmount
  useEffect(() => {
    if (!socket.connected) socket.connect();
    return () => {
      if (mediaRecorderRef.current?.state !== "inactive") stopRecording();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isRecording,
    transcripts,
    summary,
    conversationId,
    error,
    startRecording,
    stopRecording,
  };
}

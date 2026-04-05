import { useRef, useState, useCallback, useEffect } from "react";
import {
  Brain, Camera, CameraOff, ScanFace, Loader2, CheckCircle2,
  AlertCircle, UserX, UserCheck, Zap, Mic, Square, MessageSquare,
  Clock, ChevronDown, ChevronUp, RefreshCw, Activity, History,
} from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { selectPatientSession } from "@/store/selectors";
import { useMatchFaceMutation, useGetConversationsForPersonQuery } from "@/services";
import type { MatchFaceData } from "@/types";
import { useTranscription } from "@/hooks/useTranscription";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const RELATION_COLORS: Record<string, string> = {
  son:      "bg-blue-500/15 text-blue-700",
  daughter: "bg-pink-500/15 text-pink-700",
  wife:     "bg-rose-500/15 text-rose-700",
  husband:  "bg-orange-500/15 text-orange-700",
  doctor:   "bg-emerald-500/15 text-emerald-700",
  nurse:    "bg-teal-500/15 text-teal-700",
  friend:   "bg-violet-500/15 text-violet-700",
};
const relColor = (rel: string | null) =>
  RELATION_COLORS[(rel ?? "").toLowerCase()] ?? "bg-muted text-muted-foreground";

// ─── Recognition result card ───────────────────────────────────────────────────
function RecognitionCard({
  result,
  onRetry,
}: {
  result: { success: boolean; data?: MatchFaceData };
  onRetry: () => void;
}) {
  const d = result.data;
  const noFace = !d || ("error" in d && d.error === "no_face_detected");
  const isRec  = d && "recognised" in d && d.recognised;
  const isUnk  = d && "recognised" in d && !d.recognised && !noFace;

  if (noFace) return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-amber-500/10">
        <AlertCircle className="size-8 text-amber-500" />
      </div>
      <div>
        <p className="font-bold text-lg">No face detected</p>
        <p className="text-sm text-muted-foreground mt-1">Ensure good lighting and face clearly visible.</p>
      </div>
      <button onClick={onRetry} className="flex items-center gap-2 rounded-xl bg-foreground text-background px-5 py-2.5 text-sm font-semibold hover:opacity-80 transition-opacity">
        <RefreshCw className="size-4" /> Try again
      </button>
    </div>
  );

  if (isRec && "name" in d) return (
    <div className="flex flex-col items-center gap-5 py-6 text-center">
      <div className="relative">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-emerald-500/10 ring-4 ring-emerald-500/20">
          <UserCheck className="size-10 text-emerald-600" />
        </div>
        <div className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-card">
          <CheckCircle2 className="size-4 text-white" />
        </div>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-600 mb-1">Recognised</p>
        <p className="text-3xl font-bold">{d.name}</p>
        <span className={cn("inline-block mt-1.5 rounded-full px-3 py-0.5 text-xs font-semibold capitalize", relColor(d.relation))}>
          {d.relation}
        </span>
      </div>
      <div className="w-full max-w-[200px]">
        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
          <span>Confidence</span>
          <span className="font-bold text-foreground">{Math.round(d.similarity * 100)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${Math.round(d.similarity * 100)}%` }} />
        </div>
      </div>
      <button onClick={onRetry} className="flex items-center gap-2 rounded-xl border border-border px-5 py-2 text-sm font-semibold hover:bg-muted transition-colors">
        <ScanFace className="size-4" /> Scan again
      </button>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
        <UserX className="size-8 text-muted-foreground" />
      </div>
      <div>
        <p className="font-bold text-lg">Not recognised</p>
        <p className="text-sm text-muted-foreground mt-1">This face hasn't been registered. Ask your caregiver to add them.</p>
      </div>
      <button onClick={onRetry} className="flex items-center gap-2 rounded-xl border border-border px-5 py-2 text-sm font-semibold hover:bg-muted transition-colors">
        <RefreshCw className="size-4" /> Try again
      </button>
    </div>
  );
}

// ─── Past conversations panel (shown after recognition) ────────────────────────
function PersonHistoryPanel({ personId, personName }: { personId: number; personName: string }) {
  const { data, isLoading } = useGetConversationsForPersonQuery(personId);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showAll, setShowAll]       = useState(false);
  const convs = data?.data?.conversations ?? [];

  if (isLoading) return (
    <div className="flex items-center justify-center py-4">
      <Loader2 className="size-4 animate-spin text-muted-foreground" />
      <span className="ml-2 text-xs text-muted-foreground">Loading past conversations…</span>
    </div>
  );

  if (convs.length === 0) return (
    <div className="rounded-xl border border-dashed border-border px-4 py-3 text-center">
      <p className="text-xs text-muted-foreground">No previous conversations with {personName}.</p>
    </div>
  );

  // Most recent conversation that has a summary — shown prominently
  const latestWithSummary = convs.find((c) => c.summary);
  const olderConvs = showAll ? convs.slice(1) : [];

  return (
    <div className="space-y-2">
      {/* ── Latest summary card (always visible) ── */}
      {latestWithSummary && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-emerald-500/20">
            <Brain className="size-3.5 text-emerald-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Last visit with {personName}
            </span>
            <span className="ml-auto text-[10px] text-muted-foreground">
              {timeAgo(latestWithSummary.started_at)}
            </span>
          </div>
          <div className="px-4 py-3">
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">
              {latestWithSummary.summary}
            </div>
          </div>
        </div>
      )}

      {/* ── Older conversations (collapsible list) ── */}
      {convs.length > 1 && (
        <>
          <button
            onClick={() => setShowAll((v) => !v)}
            className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            <History className="size-3.5" />
            <span>{showAll ? "Hide" : "Show"} {convs.length - 1} older conversation{convs.length - 1 !== 1 ? "s" : ""}</span>
            {showAll ? <ChevronUp className="size-3 ml-auto" /> : <ChevronDown className="size-3 ml-auto" />}
          </button>

          {showAll && olderConvs.map((conv) => {
            const isOpen = expandedId === conv.id;
            return (
              <div key={conv.id} className="rounded-xl border border-border bg-muted/30 overflow-hidden">
                <button
                  onClick={() => setExpandedId(isOpen ? null : conv.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Clock className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">{formatDate(conv.started_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {conv.summary && (
                      <span className="text-[10px] font-medium bg-foreground/8 px-2 py-0.5 rounded-full">Summary</span>
                    )}
                    {isOpen ? <ChevronUp className="size-3.5 text-muted-foreground" /> : <ChevronDown className="size-3.5 text-muted-foreground" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border">
                    {conv.summary && (
                      <div className="mt-3 rounded-xl bg-foreground/5 border border-border p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">AI Summary</p>
                        <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">{conv.summary}</div>
                      </div>
                    )}
                    {conv.transcripts.length > 0 && (
                      <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Transcript</p>
                        {conv.transcripts.map((t) => (
                          <p key={t.id} className="text-xs text-muted-foreground leading-relaxed border-l-2 border-border pl-2.5 py-0.5">
                            {t.text}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ─── Face camera panel ─────────────────────────────────────────────────────────
function CameraPanel({
  patientId,
  onRecognised,
}: {
  patientId: number;
  onRecognised: (personId: number | null, personName: string) => void;
}) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [camActive, setCamActive] = useState(false);
  const [camError,  setCamError]  = useState<string | null>(null);
  const [scanning,  setScanning]  = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [result,    setResult]    = useState<{ success: boolean; data?: MatchFaceData } | null>(null);

  const [matchFace] = useMatchFaceMutation();

  const startCam = useCallback(async () => {
    setCamError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setCamActive(true);
    } catch {
      setCamError("Camera access denied. Please allow camera permissions.");
    }
  }, []);

  const stopCam = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamActive(false);
    setCountdown(null);
  }, []);

  useEffect(() => () => stopCam(), [stopCam]);

  const capture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", 0.92));
    if (!blob) return;

    setScanning(true);
    try {
      const res = await matchFace({ patientId, file: new File([blob], "cap.jpg", { type: "image/jpeg" }) }).unwrap();
      const r = res as { success: boolean; data?: MatchFaceData };
      setResult(r);
      if (r.data && "recognised" in r.data && r.data.recognised) {
        onRecognised(r.data.person_id, r.data.name);
      } else {
        onRecognised(null, "");
      }
    } catch {
      setResult({ success: false, data: { recognised: false } });
      onRecognised(null, "");
    } finally {
      setScanning(false);
      setCountdown(null);
    }
  }, [patientId, matchFace, onRecognised]);

  const startCountdown = useCallback(() => {
    let c = 3;
    setCountdown(c);
    const iv = setInterval(() => {
      c--;
      if (c === 0) { clearInterval(iv); setCountdown(null); capture(); }
      else setCountdown(c);
    }, 1000);
  }, [capture]);

  return (
    <div className="flex flex-col h-full">
      {/* Viewport */}
      <div className="relative flex-1 bg-black rounded-2xl overflow-hidden min-h-[200px]">
        <video
          ref={videoRef}
          className={cn("h-full w-full object-cover transition-opacity", !camActive && "opacity-0")}
          playsInline muted
        />
        <canvas ref={canvasRef} className="hidden" />

        {!camActive && !result && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-white/10">
              <CameraOff className="size-6 text-white/50" />
            </div>
            <p className="text-sm text-white/40">Camera not active</p>
          </div>
        )}

        {/* Scan frame */}
        {camActive && !scanning && countdown === null && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative w-40 h-48">
              {(["tl","tr","bl","br"] as const).map((p) => (
                <div key={p} className={cn("absolute size-5 border-white/70",
                  p === "tl" && "top-0 left-0 border-t-[2.5px] border-l-[2.5px] rounded-tl-lg",
                  p === "tr" && "top-0 right-0 border-t-[2.5px] border-r-[2.5px] rounded-tr-lg",
                  p === "bl" && "bottom-0 left-0 border-b-[2.5px] border-l-[2.5px] rounded-bl-lg",
                  p === "br" && "bottom-0 right-0 border-b-[2.5px] border-r-[2.5px] rounded-br-lg",
                )} />
              ))}
            </div>
          </div>
        )}

        {/* Status badges */}
        {camActive && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-sm px-2.5 py-1">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-semibold text-white">LIVE</span>
          </div>
        )}

        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex size-20 items-center justify-center rounded-2xl bg-black/70 backdrop-blur-sm ring-2 ring-white/20">
              <span className="text-5xl font-black text-white tabular-nums">{countdown}</span>
            </div>
          </div>
        )}

        {scanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm">
            <Loader2 className="size-8 text-white animate-spin" />
            <p className="text-sm font-semibold text-white/90">Analysing face…</p>
          </div>
        )}

        {/* Result overlay */}
        {result && (
          <div className="absolute inset-0 bg-card overflow-y-auto">
            <RecognitionCard result={result} onRetry={() => { setResult(null); }} />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="pt-3 space-y-2">
        {camError && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/8 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="size-3.5 shrink-0" /> {camError}
          </div>
        )}
        {!result && (
          <div className="flex gap-2">
            {!camActive ? (
              <button onClick={startCam}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-foreground text-background py-3 text-sm font-semibold hover:opacity-80 transition-opacity">
                <Camera className="size-4" /> Start camera
              </button>
            ) : (
              <>
                <button onClick={startCountdown} disabled={scanning || countdown !== null}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-foreground text-background py-3 text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-40">
                  {scanning ? <><Loader2 className="size-4 animate-spin" /> Scanning…</>
                    : countdown !== null ? <><Zap className="size-4" /> {countdown}…</>
                    : <><ScanFace className="size-4" /> Scan face</>}
                </button>
                <button onClick={stopCam} disabled={scanning}
                  className="flex items-center justify-center rounded-xl border border-border px-4 hover:bg-muted transition-colors disabled:opacity-40">
                  <CameraOff className="size-4" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Live transcription panel ──────────────────────────────────────────────────
function TranscriptionPanel({
  patientId,
  patientName,
  personId,
  autoStart,
}: {
  patientId:   number;
  patientName: string;
  personId:    number | null;
  autoStart:   boolean;
}) {
  const { isRecording, transcripts, summary, error, startRecording, stopRecording } =
    useTranscription(patientId, patientName, personId, { autoStart });

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

  return (
    <div className="flex flex-col h-full">
      {/* Summary */}
      <div className={cn(
        "rounded-2xl border bg-card overflow-hidden mb-3 transition-all",
        isRecording ? "border-emerald-500/40 ring-2 ring-emerald-500/15" : "border-border",
      )}>
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Brain className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Live summary</span>
          {isRecording && (
            <span className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Processing
            </span>
          )}
        </div>
        <div className="p-4 min-h-[80px]">
          {summary ? (
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">{summary}</div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {isRecording ? "Listening and summarising…" : "Start recording to get an AI summary."}
            </p>
          )}
        </div>
      </div>

      {/* Transcript scroll area */}
      <div className="flex-1 rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Live transcript</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Spinner shown briefly while auto-start is initialising */}
            {autoStart && !isRecording && !error && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Starting…
              </span>
            )}
            <button
              onClick={isRecording ? stopRecording : () => startRecording()}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
                isRecording
                  ? "bg-rose-500 text-white hover:bg-rose-600"
                  : "bg-foreground text-background hover:opacity-80",
              )}
            >
              {isRecording
                ? <><Square className="size-3" fill="currentColor" /> Stop</>
                : <><Mic className="size-3" fill="currentColor" /> Start</>
              }
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[120px]">
          {transcripts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 py-6 text-center">
              <Activity className="size-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">
                {isRecording ? "Listening…" : "Press Start to begin transcription."}
              </p>
            </div>
          ) : (
            transcripts.map((line) => (
              <div key={line.id}
                className="text-sm text-foreground leading-relaxed border-l-2 border-foreground/20 pl-3 py-0.5 animate-in fade-in slide-in-from-bottom-1 duration-200">
                {line.text}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 rounded-xl bg-destructive/8 border border-destructive/20 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="size-3.5 shrink-0" /> {error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Patient home page ─────────────────────────────────────────────────────────
export default function PatientModePage() {
  const session = useAppSelector(selectPatientSession);
  const [recognisedPersonId,   setRecognisedPersonId]   = useState<number | null>(null);
  const [recognisedPersonName, setRecognisedPersonName] = useState<string>("");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (!session) return null;

  const handleRecognised = useCallback((pid: number | null, name: string) => {
    setRecognisedPersonId(pid);
    setRecognisedPersonName(name);
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* ── Top greeting bar ── */}
      <div className="px-6 py-4 border-b border-border bg-card/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-foreground text-background">
            <Brain className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">{greeting}</p>
            <h1 className="text-lg font-bold leading-tight">{session.patientName}</h1>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-600">Active</span>
          </div>
        </div>
      </div>

      {/* ── Main split layout ── */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border">

          {/* ── LEFT: Conversation panel ── */}
          <div className="flex flex-col overflow-hidden p-5 gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <MessageSquare className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Conversations</h2>
            </div>

            {/* Past conversations when face recognised */}
            {recognisedPersonId && (
              <div className="shrink-0">
                <PersonHistoryPanel
                  personId={recognisedPersonId}
                  personName={recognisedPersonName}
                />
              </div>
            )}

            {/* Live transcription — takes remaining space.
                autoStart=true makes it fire automatically once a face is recognised. */}
            <div className="flex-1 min-h-0">
              <TranscriptionPanel
                patientId={session.patientId}
                patientName={session.patientName}
                personId={recognisedPersonId}
                autoStart={recognisedPersonId !== null}
              />
            </div>
          </div>

          {/* ── RIGHT: Face recognition camera ── */}
          <div className="flex flex-col p-5 gap-4 overflow-hidden">
            <div className="flex items-center gap-2 shrink-0">
              <ScanFace className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Face recognition</h2>
            </div>
            <div className="flex-1 min-h-0">
              <CameraPanel
                patientId={session.patientId}
                onRecognised={handleRecognised}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

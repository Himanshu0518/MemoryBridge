import { useRef, useState, useCallback, useEffect } from "react";
import {
  Brain, Users, Mic, Camera, CameraOff, ScanFace, Loader2,
  CheckCircle2, AlertCircle, UserX, RefreshCw, UserCheck, Zap,
  Search, X, Clock, Heart, Star, User, MessageSquare, Activity,
  ChevronRight, Eye, Shield, Sparkles, WifiOff,
} from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { selectPatientSession } from "@/store/selectors";
import {
  useGetKnownPersonsQuery,
  useGetPersonsQuery,
  useMatchFaceMutation,
} from "@/services";
import type { MatchFaceData, KnownPerson, Person } from "@/types";
import { cn } from "@/lib/utils";

// ─── Relation badge colours ───────────────────────────────────────────────────
const RELATION_COLORS: Record<string, string> = {
  son:       "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  daughter:  "bg-pink-500/15 text-pink-700 dark:text-pink-300",
  wife:      "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  husband:   "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  doctor:    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  nurse:     "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  friend:    "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  caregiver: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

function relColor(rel: string | null) {
  if (!rel) return "bg-muted text-muted-foreground";
  return RELATION_COLORS[rel.toLowerCase()] ?? "bg-muted text-muted-foreground";
}

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function timeAgo(isoDate: string) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Person avatar ────────────────────────────────────────────────────────────
function PersonAvatar({
  name, size = "md", className,
}: { name: string | null; size?: "sm" | "md" | "lg"; className?: string }) {
  const sz = { sm: "size-9 text-xs", md: "size-12 text-sm", lg: "size-16 text-lg" }[size];
  return (
    <div className={cn(
      "flex items-center justify-center rounded-full font-semibold",
      "bg-gradient-to-br from-slate-600 to-slate-800 text-white dark:from-slate-400 dark:to-slate-600",
      sz, className,
    )}>
      {initials(name)}
    </div>
  );
}

// ─── Known Person Card ────────────────────────────────────────────────────────
function KnownPersonCard({ person }: { person: KnownPerson }) {
  return (
    <div className={cn(
      "group relative flex items-center gap-3.5 rounded-2xl border border-border bg-card px-4 py-3.5",
      "hover:border-foreground/20 hover:shadow-md transition-all duration-200",
    )}>
      <PersonAvatar name={person.name} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground truncate">{person.name}</p>
        <span className={cn(
          "inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
          relColor(person.relation),
        )}>
          {person.relation ?? "Unknown relation"}
        </span>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex size-7 items-center justify-center rounded-full bg-foreground text-background">
          <CheckCircle2 className="size-3.5" />
        </div>
      </div>
    </div>
  );
}

// ─── Unknown Person Card ──────────────────────────────────────────────────────
function UnknownPersonCard({ person }: { person: Person }) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3.5">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted border-2 border-dashed border-border">
        <User className="size-5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-muted-foreground">Unknown person</p>
        <p className="text-xs text-muted-foreground/70 mt-0.5 flex items-center gap-1">
          <Clock className="size-3" />
          Last seen {timeAgo(person.last_seen)}
        </p>
      </div>
      <span className="text-[10px] font-medium bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full">
        Unidentified
      </span>
    </div>
  );
}

// ─── Live Face Scan Panel ─────────────────────────────────────────────────────
function FaceScanPanel({ patientId }: { patientId: number }) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [camActive,  setCamActive]  = useState(false);
  const [camError,   setCamError]   = useState<string | null>(null);
  const [scanning,   setScanning]   = useState(false);
  const [countdown,  setCountdown]  = useState<number | null>(null);
  const [result,     setResult]     = useState<{
    success: boolean; message: string; data?: MatchFaceData;
  } | null>(null);

  const [matchFace] = useMatchFaceMutation();

  const startCamera = useCallback(async () => {
    setCamError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCamActive(true);
    } catch {
      setCamError("Camera access denied. Please allow camera permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamActive(false);
    setCountdown(null);
  }, []);

  useEffect(() => () => { stopCamera(); }, [stopCamera]);

  const capture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", 0.92));
    if (!blob) return;
    const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
    setScanning(true);
    try {
      const res = await matchFace({ patientId, file }).unwrap();
      setResult(res as { success: boolean; message: string; data?: MatchFaceData });
    } catch {
      setResult({ success: false, message: "Recognition failed.", data: { recognised: false } });
    } finally {
      setScanning(false);
      setCountdown(null);
    }
  }, [patientId, matchFace]);

  const startCountdown = useCallback(() => {
    let c = 3;
    setCountdown(c);
    const iv = setInterval(() => {
      c--;
      if (c === 0) { clearInterval(iv); setCountdown(null); capture(); }
      else setCountdown(c);
    }, 1000);
  }, [capture]);

  const retry = () => { setResult(null); };

  // Result display
  if (result) {
    const data = result.data;
    const isRecognised = data && "recognised" in data && data.recognised;
    const isUnknown    = data && "recognised" in data && !data.recognised;
    const noFace       = !data || ("error" in data && data.error === "no_face_detected");

    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <ScanFace className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Scan result</span>
        </div>

        <div className="p-6">
          {noFace && (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-amber-500/10">
                <AlertCircle className="size-8 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-lg">No face detected</p>
                <p className="text-sm text-muted-foreground mt-1">Ensure good lighting and a clear view of the face.</p>
              </div>
              <button onClick={retry} className="flex items-center gap-2 rounded-xl bg-foreground text-background px-5 py-2.5 text-sm font-semibold hover:opacity-80 transition-opacity">
                <RefreshCw className="size-4" /> Try again
              </button>
            </div>
          )}

          {isRecognised && "name" in data && (
            <div className="flex flex-col items-center gap-5 text-center">
              <div className="relative">
                <div className="flex size-20 items-center justify-center rounded-full bg-emerald-500/10 ring-4 ring-emerald-500/20">
                  <UserCheck className="size-10 text-emerald-600" />
                </div>
                <div className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-card">
                  <CheckCircle2 className="size-4 text-white" />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-600 mb-1">Recognised ✓</p>
                <p className="text-3xl font-bold text-foreground">{data.name}</p>
                <span className={cn("inline-block mt-1 rounded-full px-3 py-1 text-xs font-semibold capitalize", relColor(data.relation))}>
                  {data.relation}
                </span>
              </div>
              <div className="w-full max-w-[220px]">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Confidence</span>
                  <span className="font-semibold text-foreground">{Math.round(data.similarity * 100)}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
                    style={{ width: `${Math.round(data.similarity * 100)}%` }} />
                </div>
              </div>
              <button onClick={retry} className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:bg-muted transition-colors">
                <ScanFace className="size-4" /> Scan again
              </button>
            </div>
          )}

          {isUnknown && !noFace && (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-muted">
                <UserX className="size-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-lg">Person not recognised</p>
                <p className="text-sm text-muted-foreground mt-1">This face doesn't match any known person. Ask your caregiver to add them.</p>
              </div>
              <button onClick={retry} className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:bg-muted transition-colors">
                <RefreshCw className="size-4" /> Try again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <Camera className="size-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Face recognition</span>
        {camActive && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Video viewport */}
        <div className="relative overflow-hidden rounded-xl bg-black aspect-video w-full">
          <video ref={videoRef}
            className={cn("h-full w-full object-cover transition-opacity", !camActive && "opacity-0")}
            playsInline muted />
          <canvas ref={canvasRef} className="hidden" />

          {!camActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="flex size-14 items-center justify-center rounded-full bg-white/10">
                <CameraOff className="size-7 text-white/60" />
              </div>
              <p className="text-sm text-white/50">Camera not active</p>
            </div>
          )}

          {/* Scan guide overlay */}
          {camActive && !scanning && countdown === null && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-44 h-52">
                {(["tl","tr","bl","br"] as const).map((pos) => (
                  <div key={pos} className={cn(
                    "absolute size-6 border-white/70",
                    pos === "tl" && "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-lg",
                    pos === "tr" && "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-lg",
                    pos === "bl" && "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-lg",
                    pos === "br" && "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-lg",
                  )} />
                ))}
              </div>
            </div>
          )}

          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex size-20 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm ring-4 ring-white/20">
                <span className="text-5xl font-bold text-white tabular-nums">{countdown}</span>
              </div>
            </div>
          )}

          {scanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 backdrop-blur-sm">
              <Loader2 className="size-8 text-white animate-spin" />
              <p className="text-sm text-white/80 font-medium">Analysing face…</p>
            </div>
          )}
        </div>

        {camError && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0 mt-0.5" /> {camError}
          </div>
        )}

        <div className="flex gap-2">
          {!camActive ? (
            <button onClick={startCamera}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-foreground text-background py-3 text-sm font-semibold hover:opacity-80 transition-opacity">
              <Camera className="size-4" /> Start camera
            </button>
          ) : (
            <>
              <button
                onClick={startCountdown}
                disabled={scanning || countdown !== null}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-foreground text-background py-3 text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-50">
                {scanning
                  ? <><Loader2 className="size-4 animate-spin" /> Scanning…</>
                  : countdown !== null
                    ? <><Zap className="size-4" /> Capturing in {countdown}…</>
                    : <><ScanFace className="size-4" /> Scan face</>
                }
              </button>
              <button onClick={stopCamera} disabled={scanning}
                className="flex items-center justify-center rounded-xl border border-border bg-card px-4 hover:bg-muted transition-colors disabled:opacity-50">
                <CameraOff className="size-4" />
              </button>
            </>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          Point the camera at a person's face and press Scan. MemoryBridge will tell you who they are.
        </p>
      </div>
    </div>
  );
}

// ─── People Dashboard ─────────────────────────────────────────────────────────
function PeopleDashboard({ patientId }: { patientId: number }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"known" | "unknown">("known");

  const { data: knownData, isLoading: knownLoading } = useGetKnownPersonsQuery(patientId);
  const { data: personsData, isLoading: personsLoading } = useGetPersonsQuery(patientId);

  const knownPersons = knownData?.data ?? [];
  const allPersons   = personsData?.data ?? [];
  const unknownPersons = allPersons.filter((p) => !p.is_known);

  const filteredKnown = knownPersons.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    (p.relation ?? "").toLowerCase().includes(query.toLowerCase())
  );

  const filteredUnknown = unknownPersons.filter((_) => query === "");

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Users className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">People</span>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="rounded-full bg-foreground/8 px-2 py-0.5 text-[11px] font-medium text-foreground">
              {knownPersons.length} known
            </span>
            {unknownPersons.length > 0 && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600">
                {unknownPersons.length} unknown
              </span>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search people…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-8 rounded-xl border border-input bg-background text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 transition-colors"
          />
          {query && (
            <button onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {!query && (
        <div className="flex border-b border-border bg-muted/30">
          {(["known", "unknown"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-2.5 text-xs font-semibold transition-colors",
                tab === t
                  ? "border-b-2 border-foreground text-foreground bg-card"
                  : "text-muted-foreground hover:text-foreground"
              )}>
              {t === "known" ? `Known (${knownPersons.length})` : `Unknown (${unknownPersons.length})`}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div className="p-4 space-y-2.5 max-h-[420px] overflow-y-auto">
        {/* Search results across known */}
        {query && (
          <>
            {filteredKnown.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Search className="size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No results for "{query}"</p>
              </div>
            ) : (
              filteredKnown.map((p) => <KnownPersonCard key={p.id} person={p} />)
            )}
          </>
        )}

        {/* Known tab */}
        {!query && tab === "known" && (
          <>
            {knownLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : knownPersons.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <Users className="size-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No known people yet</p>
                <p className="text-xs text-muted-foreground/70">Ask your caregiver to add familiar faces.</p>
              </div>
            ) : (
              knownPersons.map((p) => <KnownPersonCard key={p.id} person={p} />)
            )}
          </>
        )}

        {/* Unknown tab */}
        {!query && tab === "unknown" && (
          <>
            {personsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : unknownPersons.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
                  <Shield className="size-5 text-emerald-600" />
                </div>
                <p className="text-sm font-medium">All clear!</p>
                <p className="text-xs text-muted-foreground/70">No unidentified visitors.</p>
              </div>
            ) : (
              unknownPersons.map((p) => <UnknownPersonCard key={p.id} person={p} />)
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Quick fact cards at top ───────────────────────────────────────────────────
function StatCard({ icon, label, value, accent }: {
  icon: React.ReactNode; label: string; value: string | number; accent?: string;
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5",
      "hover:shadow-sm transition-shadow",
    )}>
      <div className={cn("flex size-9 items-center justify-center rounded-xl", accent ?? "bg-muted")}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
        <p className="text-lg font-bold leading-tight">{value}</p>
      </div>
    </div>
  );
}

// ─── Upcoming conversation summary placeholder ────────────────────────────────
function ConversationPlaceholder() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/20 overflow-hidden">
      <div className="px-5 py-4 border-b border-dashed border-border flex items-center gap-2">
        <MessageSquare className="size-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-muted-foreground">Conversation summaries</span>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          Coming soon
        </span>
      </div>
      <div className="p-6 flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Mic className="size-5 text-muted-foreground/50" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Live transcription & summaries</p>
          <p className="text-xs text-muted-foreground/60 mt-1 max-w-[260px] mx-auto leading-relaxed">
            Soon, every conversation will be automatically transcribed and summarised so you never miss important details.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-1">
          {["Live transcription", "Auto summaries", "Visit history"].map((f) => (
            <span key={f} className="rounded-full border border-dashed border-border text-[10px] font-medium text-muted-foreground px-2.5 py-1">
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main patient mode page ───────────────────────────────────────────────────
export default function PatientModePage() {
  const session = useAppSelector(selectPatientSession);

  const { data: knownData } = useGetKnownPersonsQuery(
    session?.patientId ?? 0,
    { skip: !session }
  );
  const { data: personsData } = useGetPersonsQuery(
    session?.patientId ?? 0,
    { skip: !session }
  );

  if (!session) return null;

  const knownCount   = knownData?.data?.length ?? 0;
  const unknownCount = (personsData?.data ?? []).filter((p) => !p.is_known).length;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8">

      {/* ── Greeting ── */}
      <div className="relative rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-foreground/5 to-foreground/[0.02] px-5 py-5">
        <div className="absolute -top-6 -right-6 size-32 rounded-full bg-foreground/4 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
              <Brain className="size-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium tracking-wide uppercase">MemoryBridge</p>
              <h1 className="text-xl font-bold leading-tight">{greeting}, {session.patientName}</h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            I'm here to help you recognise familiar faces and remember important things. Point the camera at someone and I'll tell you who they are.
          </p>
          <div className="flex items-center gap-1.5 mt-3">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-600 font-medium">System active</span>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Heart className="size-4 text-rose-500" />}
          label="Familiar people"
          value={knownCount}
          accent="bg-rose-500/10"
        />
        <StatCard
          icon={<Activity className="size-4 text-amber-500" />}
          label="Unidentified"
          value={unknownCount}
          accent="bg-amber-500/10"
        />
      </div>

      {/* ── Face scanner ── */}
      <FaceScanPanel patientId={session.patientId} />

      {/* ── People list ── */}
      <PeopleDashboard patientId={session.patientId} />

      {/* ── Conversation summary placeholder ── */}
      <ConversationPlaceholder />

      {/* ── Help note ── */}
      <p className="text-center text-[11px] text-muted-foreground">
        Need help? Ask your caregiver to press "Exit patient mode" at the top.
      </p>
    </div>
  );
}

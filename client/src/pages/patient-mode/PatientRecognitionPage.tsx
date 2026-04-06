import { useRef, useState, useCallback, useEffect } from "react";
import {
  ScanFace, Camera, CameraOff, Loader2, CheckCircle2,
  AlertCircle, UserX, UserCheck, Zap, RefreshCw, Upload,
} from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { selectPatientSession } from "@/store/selectors";
import { useMatchFaceMutation } from "@/services";
import type { MatchFaceData } from "@/types";
import { cn } from "@/lib/utils";

const RELATION_COLORS: Record<string, string> = {
  son: "bg-blue-500/15 text-blue-700", daughter: "bg-pink-500/15 text-pink-700",
  wife: "bg-rose-500/15 text-rose-700", husband: "bg-orange-500/15 text-orange-700",
  doctor: "bg-emerald-500/15 text-emerald-700", nurse: "bg-teal-500/15 text-teal-700",
  friend: "bg-violet-500/15 text-violet-700",
};
const relColor = (r: string | null) =>
  RELATION_COLORS[(r ?? "").toLowerCase()] ?? "bg-muted text-muted-foreground";

// ─── Result display ────────────────────────────────────────────────────────────
function Result({ data, onRetry }: { data: MatchFaceData | undefined; onRetry: () => void }) {
  const noFace = !data || ("error" in data && data.error === "no_face_detected");
  const isRec  = data && "recognised" in data && data.recognised;

  if (noFace) return (
    <div className="flex flex-col items-center gap-5 py-10 text-center">
      <div className="flex size-20 items-center justify-center rounded-2xl bg-amber-500/10 ring-4 ring-amber-500/20">
        <AlertCircle className="size-10 text-amber-500" />
      </div>
      <div>
        <p className="text-2xl font-bold">No face detected</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
          Make sure the face is well-lit, centred, and unobstructed.
        </p>
      </div>
      <button onClick={onRetry}
        className="flex items-center gap-2 rounded-xl bg-foreground text-background px-6 py-3 font-semibold hover:opacity-80 transition-opacity">
        <RefreshCw className="size-4" /> Try again
      </button>
    </div>
  );

  if (isRec && "name" in data) return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <div className="relative">
        {data.image_url ? (
          <img src={data.image_url} alt={data.name} className="size-24 rounded-2xl object-cover ring-4 ring-emerald-500/25" />
        ) : (
          <div className="flex size-24 items-center justify-center rounded-2xl bg-emerald-500/10 ring-4 ring-emerald-500/25">
            <UserCheck className="size-12 text-emerald-600" />
          </div>
        )}
        <div className="absolute -bottom-2 -right-2 flex size-9 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-card">
          <CheckCircle2 className="size-5 text-white" />
        </div>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-600 mb-2">Recognised</p>
        <p className="text-4xl font-black tracking-tight">{data.name}</p>
        <span className={cn("inline-block mt-2 rounded-full px-4 py-1 text-sm font-semibold capitalize", relColor(data.relation))}>
          {data.relation}
        </span>
      </div>
      <div className="w-full max-w-[240px]">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Confidence</span>
          <span className="font-bold text-foreground">{Math.round(data.similarity * 100)}%</span>
        </div>
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
            style={{ width: `${Math.round(data.similarity * 100)}%` }} />
        </div>
      </div>
      <button onClick={onRetry}
        className="flex items-center gap-2 rounded-xl border border-border px-6 py-3 font-semibold hover:bg-muted transition-colors">
        <ScanFace className="size-4" /> Scan again
      </button>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-5 py-10 text-center">
      <div className="flex size-20 items-center justify-center rounded-2xl bg-muted ring-4 ring-border">
        <UserX className="size-10 text-muted-foreground" />
      </div>
      <div>
        <p className="text-2xl font-bold">Not recognised</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
          This person hasn't been registered. Ask your caregiver to add their face.
        </p>
      </div>
      <button onClick={onRetry}
        className="flex items-center gap-2 rounded-xl border border-border px-6 py-3 font-semibold hover:bg-muted transition-colors">
        <RefreshCw className="size-4" /> Try again
      </button>
    </div>
  );
}

// ─── Patient recognition page ─────────────────────────────────────────────────
export default function PatientRecognitionPage() {
  const session   = useAppSelector(selectPatientSession);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode,     setMode]     = useState<"camera" | "upload">("camera");
  const [camActive,  setCamActive]  = useState(false);
  const [camError,   setCamError]   = useState<string | null>(null);
  const [scanning,   setScanning]   = useState(false);
  const [countdown,  setCountdown]  = useState<number | null>(null);
  const [result,     setResult]     = useState<MatchFaceData | undefined>(undefined);
  const [hasResult,  setHasResult]  = useState(false);
  const [preview,    setPreview]    = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [matchFace] = useMatchFaceMutation();
  const patientId = session?.patientId ?? 0;

  const startCam = useCallback(async () => {
    setCamError(null);
    setHasResult(false);
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

  const doMatch = useCallback(async (file: File) => {
    setScanning(true);
    try {
      const res = await matchFace({ patientId, file }).unwrap();
      setResult((res as { data?: MatchFaceData }).data);
      setHasResult(true);
    } catch {
      setResult(undefined);
      setHasResult(true);
    } finally {
      setScanning(false);
      setCountdown(null);
    }
  }, [patientId, matchFace]);

  const capture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", 0.92));
    if (!blob) return;
    await doMatch(new File([blob], "cap.jpg", { type: "image/jpeg" }));
  }, [doMatch]);

  const startCountdown = useCallback(() => {
    let c = 3;
    setCountdown(c);
    const iv = setInterval(() => {
      c--;
      if (c === 0) { clearInterval(iv); setCountdown(null); capture(); }
      else setCountdown(c);
    }, 1000);
  }, [capture]);

  const retry = () => { setHasResult(false); setResult(undefined); setPreview(null); setUploadFile(null); };

  if (!session) return null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-lg mx-auto px-5 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
            <ScanFace className="size-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Face recognition</h1>
            <p className="text-sm text-muted-foreground">Point the camera at someone to identify them.</p>
          </div>
        </div>

        {/* Result */}
        {hasResult ? (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <Result data={result} onRetry={retry} />
          </div>
        ) : (
          <>
            {/* Mode tabs */}
            <div className="flex rounded-xl border border-border bg-muted p-1 gap-1">
              {(["camera", "upload"] as const).map((m) => (
                <button key={m} onClick={() => { setMode(m); stopCam(); }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all",
                    mode === m ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}>
                  {m === "camera" ? <><Camera className="size-4" /> Live camera</> : <><Upload className="size-4" /> Upload photo</>}
                </button>
              ))}
            </div>

            {/* Camera mode */}
            {mode === "camera" && (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
                  <video ref={videoRef}
                    className={cn("h-full w-full object-cover", !camActive && "opacity-0")}
                    playsInline muted />
                  <canvas ref={canvasRef} className="hidden" />

                  {!camActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <div className="flex size-16 items-center justify-center rounded-2xl bg-white/10">
                        <CameraOff className="size-8 text-white/40" />
                      </div>
                      <p className="text-sm text-white/40">Camera not active</p>
                    </div>
                  )}

                  {/* Scan frame */}
                  {camActive && !scanning && countdown === null && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="relative w-44 h-52">
                        {(["tl","tr","bl","br"] as const).map((p) => (
                          <div key={p} className={cn("absolute size-6 border-white/70",
                            p === "tl" && "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-xl",
                            p === "tr" && "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-xl",
                            p === "bl" && "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-xl",
                            p === "br" && "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-xl",
                          )} />
                        ))}
                      </div>
                    </div>
                  )}

                  {camActive && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-white">LIVE</span>
                    </div>
                  )}

                  {countdown !== null && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex size-24 items-center justify-center rounded-2xl bg-black/70 backdrop-blur-sm ring-2 ring-white/20">
                        <span className="text-6xl font-black text-white tabular-nums">{countdown}</span>
                      </div>
                    </div>
                  )}

                  {scanning && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm">
                      <Loader2 className="size-10 text-white animate-spin" />
                      <p className="text-base font-semibold text-white/90">Analysing face…</p>
                    </div>
                  )}
                </div>

                {camError && (
                  <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/8 px-3 py-2.5 text-sm text-destructive">
                    <AlertCircle className="size-4 shrink-0" /> {camError}
                  </div>
                )}

                <div className="flex gap-2">
                  {!camActive ? (
                    <button onClick={startCam}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-foreground text-background py-3.5 font-semibold hover:opacity-80 transition-opacity">
                      <Camera className="size-4" /> Start camera
                    </button>
                  ) : (
                    <>
                      <button onClick={startCountdown} disabled={scanning || countdown !== null}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-foreground text-background py-3.5 font-semibold hover:opacity-80 transition-opacity disabled:opacity-40">
                        {scanning ? <><Loader2 className="size-4 animate-spin" /> Scanning…</>
                          : countdown !== null ? <><Zap className="size-4" /> Capturing in {countdown}…</>
                          : <><ScanFace className="size-4" /> Scan face</>}
                      </button>
                      <button onClick={stopCam} disabled={scanning}
                        className="flex items-center justify-center rounded-xl border border-border px-4 hover:bg-muted transition-colors disabled:opacity-40">
                        <CameraOff className="size-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Upload mode */}
            {mode === "upload" && (
              <div className="space-y-3">
                <label htmlFor="upload-rec"
                  className={cn(
                    "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-colors",
                    preview ? "border-foreground/30" : "border-border hover:border-foreground/20",
                  )}>
                  {preview ? (
                    <img src={preview} alt="Preview" className="h-44 rounded-xl object-cover" />
                  ) : (
                    <>
                      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
                        <Upload className="size-6 text-muted-foreground" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold">Click to upload a photo</p>
                        <p className="text-sm text-muted-foreground mt-1">JPEG, PNG, WEBP</p>
                      </div>
                    </>
                  )}
                  <input id="upload-rec" type="file" accept="image/*" className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setUploadFile(f);
                      setPreview(URL.createObjectURL(f));
                    }} />
                </label>

                <button
                  onClick={() => uploadFile && doMatch(uploadFile)}
                  disabled={!uploadFile || scanning}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-foreground text-background py-3.5 font-semibold hover:opacity-80 transition-opacity disabled:opacity-40">
                  {scanning ? <><Loader2 className="size-4 animate-spin" /> Matching…</> : <><ScanFace className="size-4" /> Match face</>}
                </button>
              </div>
            )}

            {/* Tips */}
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-bold text-foreground mb-1.5">Tips for best results</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• Good, even lighting on the face</li>
                <li>• Face centred and unobstructed</li>
                <li>• Avoid extreme angles or motion blur</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

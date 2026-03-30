import { useState } from "react";
import { Outlet, Navigate, useNavigate } from "react-router-dom";
import { LogOut, Brain, Eye, EyeOff, Lock, Mail, AlertCircle, Loader2 } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { selectPatientSession } from "@/store/selectors";
import { useExitPatientSessionMutation, useVerifyCaregiverMutation } from "@/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Logout guard modal ───────────────────────────────────────────────────────
function LogoutGuardModal({ onCancel }: { onCancel: () => void }) {
  const session = useAppSelector(selectPatientSession);
  const navigate = useNavigate();

  const [exitSession]                        = useExitPatientSessionMutation();
  const [verifyCaregiver, { isLoading }]     = useVerifyCaregiverMutation();

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!session) return;
    setError(null);

    try {
      // 1. Verify caregiver owns this patient
      await verifyCaregiver({
        email,
        password,
        patient_id: session.patientId,
      }).unwrap();

      // 2. Clear patient session cookie + Redux state
      await exitSession().unwrap();

      // 3. Navigate back to caregiver dashboard
      navigate("/patients");
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message;
      setError(msg ?? "Incorrect credentials. Please try again.");
    }
  };

  return (
    // Faux-viewport div so fixed-style overlay works without position:fixed
    <div
      style={{ minHeight: 400 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm mx-4 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center space-y-1">
          <div className="flex size-12 items-center justify-center rounded-full bg-foreground text-background mx-auto mb-3">
            <Lock className="size-5" />
          </div>
          <h2 className="text-lg font-semibold">Caregiver verification</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enter your caregiver credentials to exit patient mode for{" "}
            <span className="font-medium text-foreground">{session?.patientName}</span>.
          </p>
        </div>

        {/* Form */}
        <div className="px-6 pb-6 space-y-3">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-input bg-background text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 transition-colors"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
              className="w-full h-9 pl-9 pr-9 rounded-lg border border-input bg-background text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={handleConfirm}
              disabled={isLoading || !email || !password}
            >
              {isLoading
                ? <><Loader2 className="size-4 animate-spin" /> Verifying…</>
                : "Exit patient mode"
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Patient mode layout ──────────────────────────────────────────────────────
export default function PatientModeLayout() {
  const session        = useAppSelector(selectPatientSession);
  const [showGuard, setShowGuard] = useState(false);

  if (!session) {
    return <Navigate to="/patients" replace />;
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground antialiased flex flex-col">
      {/* Logout guard overlay */}
      {showGuard && (
        <LogoutGuardModal onCancel={() => setShowGuard(false)} />
      )}

      {/* Minimal header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
              <Brain className="size-4" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Patient mode</span>
              <span className="text-sm font-semibold">{session.patientName}</span>
            </div>
          </div>

          <button
            onClick={() => setShowGuard(true)}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="size-3.5" />
            Exit patient mode
          </button>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}

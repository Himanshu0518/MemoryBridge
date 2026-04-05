import { useState } from "react";
import { Outlet, Navigate, NavLink, useNavigate } from "react-router-dom";
import {
  Brain, Home, ScanFace, History, LogOut,
  Eye, EyeOff, Lock, Mail, AlertCircle, Loader2, Menu, X,
} from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { selectPatientSession } from "@/store/selectors";
import { useExitPatientSessionMutation, useVerifyCaregiverMutation } from "@/services";
import { cn } from "@/lib/utils";

// ─── Nav items ─────────────────────────────────────────────────────────────────
const NAV = [
  { to: "/patient-mode",             label: "Home",        icon: Home,     end: true },
  { to: "/patient-mode/recognition", label: "Recognise",   icon: ScanFace, end: false },
  { to: "/patient-mode/history",     label: "History",     icon: History,  end: false },
];

// ─── Logout guard modal ────────────────────────────────────────────────────────
function LogoutGuardModal({ onCancel }: { onCancel: () => void }) {
  const session  = useAppSelector(selectPatientSession);
  const navigate = useNavigate();

  const [exitSession]                    = useExitPatientSessionMutation();
  const [verifyCaregiver, { isLoading }] = useVerifyCaregiverMutation();

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!session) return;
    setError(null);
    try {
      await verifyCaregiver({
        email,
        password,
        patient_id: session.patientId,
      }).unwrap();
      await exitSession().unwrap();
      navigate("/patients");
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message;
      setError(msg ?? "Incorrect credentials. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="w-full max-w-[360px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="px-6 pt-7 pb-5 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-foreground text-background mx-auto mb-4">
            <Lock className="size-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Caregiver verification</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Sign in as the caregiver for{" "}
            <span className="font-semibold text-foreground">{session?.patientName}</span>{" "}
            to exit patient mode.
          </p>
        </div>

        <div className="px-6 pb-7 space-y-3">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/8 px-3.5 py-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              type="email"
              placeholder="Caregiver email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-input bg-background text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 transition-colors"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
              className="w-full h-10 pl-10 pr-10 rounded-xl border border-input bg-background text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="h-10 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading || !email || !password}
              className="h-10 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isLoading
                ? <><Loader2 className="size-4 animate-spin" /> Verifying…</>
                : "Exit mode"
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar nav item ─────────────────────────────────────────────────────────
function SideNavItem({
  to, label, icon: Icon, end, onClick,
}: {
  to: string; label: string; icon: React.ElementType; end: boolean; onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
          isActive
            ? "bg-foreground text-background shadow-sm"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )
      }
    >
      <Icon className="size-4 shrink-0" />
      <span>{label}</span>
    </NavLink>
  );
}

// ─── Patient mode layout ───────────────────────────────────────────────────────
export default function PatientModeLayout() {
  const session = useAppSelector(selectPatientSession);
  const [showGuard,  setShowGuard]  = useState(false);
  const [mobileSide, setMobileSide] = useState(false);

  if (!session) {
    return <Navigate to="/patients" replace />;
  }

  const initials = session.patientName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {showGuard && <LogoutGuardModal onCancel={() => setShowGuard(false)} />}

      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
        <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-card">
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border">
            <div className="flex size-7 items-center justify-center rounded-lg bg-foreground text-background">
              <Brain className="size-3.5" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Patient mode
              </span>
              <span className="text-sm font-semibold truncate">{session.patientName}</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-1">
            {NAV.map((item) => (
              <SideNavItem key={item.to} {...item} />
            ))}
          </nav>

          {/* Bottom — patient avatar + exit */}
          <div className="p-3 border-t border-border space-y-2">
            {/* Patient pill */}
            <div className="flex items-center gap-2.5 rounded-xl bg-muted/60 px-3 py-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-xs font-bold">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{session.patientName}</p>
                <p className="text-[10px] text-muted-foreground">Active session</p>
              </div>
            </div>

            {/* Exit */}
            <button
              onClick={() => setShowGuard(true)}
              className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <LogOut className="size-3.5" />
              Exit patient mode
            </button>
          </div>
        </aside>

        {/* ── Mobile overlay sidebar ───────────────────────────────────────── */}
        {mobileSide && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileSide(false)}
            />
            <aside className="relative z-10 w-64 h-full bg-card border-r border-border flex flex-col">
              <div className="flex items-center justify-between px-4 h-14 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-foreground text-background">
                    <Brain className="size-3.5" />
                  </div>
                  <span className="text-sm font-semibold">{session.patientName}</span>
                </div>
                <button onClick={() => setMobileSide(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="size-5" />
                </button>
              </div>
              <nav className="flex-1 p-3 space-y-1">
                {NAV.map((item) => (
                  <SideNavItem key={item.to} {...item} onClick={() => setMobileSide(false)} />
                ))}
              </nav>
              <div className="p-3 border-t border-border">
                <button
                  onClick={() => { setMobileSide(false); setShowGuard(true); }}
                  className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <LogOut className="size-4" />
                  Exit patient mode
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* ── Main content area ────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile top bar */}
          <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-border bg-card shrink-0">
            <button onClick={() => setMobileSide(true)} className="text-muted-foreground hover:text-foreground transition-colors">
              <Menu className="size-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-md bg-foreground text-background">
                <Brain className="size-3" />
              </div>
              <span className="text-sm font-semibold">{session.patientName}</span>
            </div>
            <button
              onClick={() => setShowGuard(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="size-4" />
            </button>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}

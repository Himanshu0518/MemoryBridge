import { Outlet } from "react-router-dom";

// ─── Decorative grid texture ──────────────────────────────────────────────────
function GridPattern() {
  return (
    <svg
      className="absolute inset-0 h-full w-full opacity-[0.04]"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <pattern id="auth-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#auth-grid)" />
    </svg>
  );
}

// ─── Brain icon ───────────────────────────────────────────────────────────────
function BrainIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
    </svg>
  );
}

const features = [
  "Store and organise your most important memories",
  "Bridge connections between people and moments",
  "Never lose what matters most to you",
];

/**
 * AuthLayout — Split-screen shell for all guest auth pages.
 *
 * Auth guard is handled upstream by <GuestRoute /> in routes.tsx,
 * so this component focuses purely on layout and branding.
 *
 * ┌────────────────────────┬───────────────────────┐
 * │  Branding panel (md+)  │  <Outlet /> — form    │
 * └────────────────────────┴───────────────────────┘
 */
export default function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-background text-foreground antialiased">
      {/* ── Left branding panel ───────────────────────────────────────────── */}
      <aside
        aria-hidden="true"
        className="relative hidden flex-col justify-between overflow-hidden bg-foreground px-10 py-12 text-background md:flex md:w-[45%] lg:w-[50%]"
      >
        <GridPattern />
        {/* Glow blobs */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-primary opacity-20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 right-10 h-64 w-64 rounded-full bg-primary/60 opacity-20 blur-3xl" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-background/10 ring-1 ring-background/20">
            <BrainIcon className="size-4 text-background" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-background">
            MemoryBridge
          </span>
        </div>

        {/* Quote + features */}
        <div className="relative z-10 space-y-8">
          <blockquote className="space-y-3">
            <p className="text-2xl font-semibold leading-snug tracking-tight text-background lg:text-3xl">
              "Memory is the treasury and guardian of all things."
            </p>
            <footer className="text-sm font-medium text-background/60">— Cicero</footer>
          </blockquote>

          <ul className="space-y-2.5 text-sm text-background/70">
            {features.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <svg
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="mt-0.5 size-3.5 shrink-0 text-background/50"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                    clipRule="evenodd"
                  />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-background/40">
          © {new Date().getFullYear()} MemoryBridge. All rights reserved.
        </p>
      </aside>

      {/* ── Right form panel ──────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-10">
        {/* Mobile-only logo */}
        <div className="mb-8 flex items-center gap-2 md:hidden">
          <div className="flex size-7 items-center justify-center rounded-lg bg-foreground/10 ring-1 ring-foreground/20">
            <BrainIcon className="size-4" />
          </div>
          <span className="text-lg font-semibold tracking-tight">MemoryBridge</span>
        </div>

        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

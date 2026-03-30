import { Brain, Users, Mic } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { selectPatientSession } from "@/store/selectors";

/**
 * PatientModePage — the patient-facing home screen.
 *
 * This is what the patient sees after the caregiver hands them the device.
 * Deliberately simple: large text, no complex controls, calming layout.
 *
 * Future: this page will host the live camera feed, face recognition results,
 * and real-time transcription. For now it shows a clear "you are logged in" 
 * state with the features that are coming.
 */
export default function PatientModePage() {
  const session = useAppSelector(selectPatientSession);

  if (!session) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-10 text-center px-4">
      {/* Greeting */}
      <div className="space-y-3">
        <div className="flex size-20 items-center justify-center rounded-full bg-foreground text-background mx-auto">
          <Brain className="size-10" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          Hello, {session.patientName}
        </h1>
        <p className="text-muted-foreground text-lg max-w-sm mx-auto leading-relaxed">
          MemoryBridge is here to help you. Your caregiver has set everything up for you.
        </p>
      </div>

      {/* Feature cards — what's active / coming soon */}
      <div className="grid gap-4 sm:grid-cols-2 max-w-lg w-full">
        <FeatureCard
          icon={<Users className="size-6" />}
          title="Face recognition"
          description="The camera will recognise familiar faces and tell you who they are."
          status="coming soon"
        />
        <FeatureCard
          icon={<Mic className="size-6" />}
          title="Live transcription"
          description="Conversations will be transcribed and summarised for you in real time."
          status="coming soon"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        If you need help, ask your caregiver to press "Exit patient mode" at the top.
      </p>
    </div>
  );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({
  icon,
  title,
  description,
  status,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: "active" | "coming soon";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-left space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          status === "active"
            ? "bg-emerald-500/10 text-emerald-600"
            : "bg-muted text-muted-foreground"
        }`}>
          {status}
        </span>
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

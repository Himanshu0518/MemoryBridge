import { useNavigate } from "react-router-dom";
import { ScanFace, Loader2, AlertCircle, User2, ChevronRight, Brain } from "lucide-react";
import { useGetPatientsQuery } from "@/services";
import { Button } from "@/components/ui/button";

export default function RecognitionHubPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useGetPatientsQuery();
  const patients = data?.data ?? [];

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ScanFace className="size-6 text-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">Recognition</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Select a patient to run face recognition for.
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          Failed to load patients.
        </div>
      )}

      {!isLoading && !isError && patients.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Brain className="size-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">No patients yet</p>
            <p className="text-sm text-muted-foreground">Add a patient first to use recognition.</p>
          </div>
          <Button size="sm" onClick={() => navigate("/patients")}>
            Go to Patients
          </Button>
        </div>
      )}

      {patients.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground px-1">
            Select patient
          </p>
          {patients.map((patient) => (
            <button
              key={patient.id}
              onClick={() => navigate(`/recognition/${patient.id}`)}
              className="group flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 text-left transition-all hover:border-foreground/20 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-foreground text-background">
                  <User2 className="size-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{patient.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                    {patient.age ? `${patient.age} yrs` : ""}
                    {patient.age && patient.diagnosis_level ? " · " : ""}
                    {patient.diagnosis_level ? `${patient.diagnosis_level} dementia` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <ScanFace className="size-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

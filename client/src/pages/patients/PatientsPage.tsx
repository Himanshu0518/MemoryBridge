import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, User2, ChevronRight, Loader2, Trash2,
  AlertCircle, Brain, Calendar, Activity,
} from "lucide-react";
import {
  useGetPatientsQuery,
  useCreatePatientMutation,
  useDeletePatientMutation,
} from "@/services";
import type { Patient } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { cn } from "@/lib/utils";

// ─── Schema ───────────────────────────────────────────────────────────────────
const createPatientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.number().min(0).max(120).optional(),
  diagnosis_level: z.enum(["mild", "moderate", "severe"]).optional().or(z.literal("")),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const diagnosisColors: Record<string, string> = {
  mild:     "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20",
  moderate: "bg-amber-500/10  text-amber-600  ring-amber-500/20",
  severe:   "bg-red-500/10    text-red-600    ring-red-500/20",
};

function DiagnosisBadge({ level }: { level: string | null }) {
  if (!level) return null;
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset capitalize",
      diagnosisColors[level] ?? "bg-muted text-muted-foreground ring-border"
    )}>
      {level}
    </span>
  );
}

// ─── Add Patient Modal ────────────────────────────────────────────────────────
function AddPatientModal({ onClose }: { onClose: () => void }) {
  const [createPatient, { isLoading }] = useCreatePatientMutation();
  const {
    register, handleSubmit,
    formState: { errors },
  } = useForm<any>({ resolver: zodResolver(createPatientSchema) });

  const onSubmit: SubmitHandler<any> = async (data) => {
    await createPatient({
      name: data.name,
      age: data.age as number | undefined,
      diagnosis_level: (data.diagnosis_level === "" ? undefined : data.diagnosis_level) as any,
    }).unwrap();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold">Add new patient</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create a new dementia patient profile.
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          <FormField label="Full name" error={errors.name?.message as string} htmlFor="p-name" required>
            <Input id="p-name" placeholder="Ramesh Kumar" {...register("name")} />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Age" error={errors.age?.message as string} htmlFor="p-age">
              <Input id="p-age" type="number" placeholder="72" {...register("age", { valueAsNumber: true })} />
            </FormField>
            <FormField label="Diagnosis level" htmlFor="p-diagnosis">
              <select
                id="p-diagnosis"
                {...register("diagnosis_level")}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors"
              >
                <option value="">— Select —</option>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
            </FormField>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isLoading}>
              {isLoading ? <><Loader2 className="animate-spin" /> Creating…</> : "Create patient"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Patient Card ─────────────────────────────────────────────────────────────
function PatientCard({ patient }: { patient: Patient }) {
  const navigate = useNavigate();
  const [deletePatient, { isLoading: deleting }] = useDeletePatientMutation();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await deletePatient(patient.id).unwrap();
  };

  return (
    <div
      onClick={() => navigate(`/patients/${patient.id}`)}
      className="group relative flex cursor-pointer items-center justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-foreground/20 hover:shadow-md"
    >
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <User2 className="size-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">{patient.name}</p>
          <div className="mt-0.5 flex items-center gap-2 flex-wrap">
            {patient.age && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="size-3" /> {patient.age} yrs
              </span>
            )}
            <DiagnosisBadge level={patient.diagnosis_level} />
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className={cn(
            "rounded-md p-1.5 transition-colors opacity-0 group-hover:opacity-100",
            confirmDelete
              ? "bg-red-500/10 text-red-600 hover:bg-red-500/20"
              : "text-muted-foreground hover:bg-muted hover:text-destructive"
          )}
          aria-label={confirmDelete ? "Confirm delete" : "Delete patient"}
          title={confirmDelete ? "Click again to confirm" : "Delete patient"}
        >
          {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        </button>
        <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </div>
  );
}

// ─── Patients Page ────────────────────────────────────────────────────────────
export default function PatientsPage() {
  const { data, isLoading, isError } = useGetPatientsQuery();
  const [showAdd, setShowAdd] = useState(false);
  const patients = data?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your dementia patient profiles.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} className="shrink-0">
          <Plus className="size-4" />
          Add patient
        </Button>
      </div>

      {/* States */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          Failed to load patients. Please try again.
        </div>
      )}

      {!isLoading && !isError && patients.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Brain className="size-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">No patients yet</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Add your first patient to get started.
            </p>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="size-4" /> Add patient
          </Button>
        </div>
      )}

      {patients.length > 0 && (
        <div className="space-y-2">
          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {(["mild", "moderate", "severe"] as const).map((level) => {
              const count = patients.filter((p) => p.diagnosis_level === level).length;
              return (
                <div key={level} className="rounded-lg border border-border bg-card px-4 py-3">
                  <p className="text-xl font-semibold">{count}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Activity className="size-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground capitalize">{level}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cards */}
          <div className="grid gap-2">
            {patients.map((p) => <PatientCard key={p.id} patient={p} />)}
          </div>
        </div>
      )}

      {showAdd && <AddPatientModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

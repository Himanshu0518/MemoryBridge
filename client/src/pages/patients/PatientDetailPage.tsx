import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft, Plus, User2, Camera, Loader2, AlertCircle,
  Trash2, Pencil, CheckCircle2, UserCheck, UserX, ScanFace,
} from "lucide-react";
import {
  useGetPatientQuery,
  useGetPersonsQuery,
  useDeletePersonMutation,
  useUpdatePersonMutation,
  useStoreKnownFaceMutation,
} from "@/services";
import type { Person } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { cn } from "@/lib/utils";

// ─── Schemas ──────────────────────────────────────────────────────────────────
const addFaceSchema = z.object({
  name:     z.string().min(2, "Name required"),
  relation: z.string().min(1, "Relation required"),
});
type AddFaceForm = z.infer<typeof addFaceSchema>;

const labelSchema = z.object({
  name:     z.string().min(2, "Name required"),
  relation: z.string().min(1, "Relation required"),
});
type LabelForm = z.infer<typeof labelSchema>;

// ─── Add Known Face Modal ─────────────────────────────────────────────────────
function AddFaceModal({
  patientId,
  onClose,
}: {
  patientId: number;
  onClose: () => void;
}) {
  const [storeKnownFace, { isLoading }] = useStoreKnownFaceMutation();
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile]       = useState<File | null>(null);
  const [fileError, setFileError] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<AddFaceForm>({
    resolver: zodResolver(addFaceSchema),
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { setFileError("Please upload an image file."); return; }
    setFileError("");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const onSubmit = async (data: AddFaceForm) => {
    if (!file) { setFileError("Please select a photo."); return; }
    try {
      await storeKnownFace({ patientId, name: data.name, relation: data.relation, file }).unwrap();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message;
      setFileError(msg ?? "Failed to register face. Ensure the photo shows a clear face.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold">Register known person</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Upload a clear photo. The face will be encoded and stored.
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          {/* Photo upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Photo <span className="text-destructive">*</span>
            </label>
            <label
              htmlFor="face-file"
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors",
                preview ? "border-foreground/30" : "border-border hover:border-foreground/30"
              )}
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="h-32 w-32 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <>
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                    <Camera className="size-5 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Click to upload photo
                  </span>
                </>
              )}
              <input
                id="face-file"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleFile}
              />
            </label>
            {fileError && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="size-3.5 shrink-0" /> {fileError}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Full name" error={errors.name?.message} htmlFor="f-name" required>
              <Input id="f-name" placeholder="Rahul Singh" {...register("name")} />
            </FormField>
            <FormField label="Relation" error={errors.relation?.message} htmlFor="f-relation" required>
              <Input id="f-relation" placeholder="Son" {...register("relation")} />
            </FormField>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={isLoading}>
              {isLoading ? <><Loader2 className="animate-spin" /> Registering…</> : "Register face"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Label Unknown Modal ──────────────────────────────────────────────────────
function LabelUnknownModal({
  patientId,
  person,
  onClose,
}: {
  patientId: number;
  person: Person;
  onClose: () => void;
}) {
  const [updatePerson, { isLoading }] = useUpdatePersonMutation();
  const { register, handleSubmit, formState: { errors } } = useForm<LabelForm>({
    resolver: zodResolver(labelSchema),
    defaultValues: { name: person.name ?? "", relation: person.relation ?? "" },
  });

  const onSubmit = async (data: LabelForm) => {
    await updatePerson({
      patientId,
      personId: person.id,
      payload: { name: data.name, relation: data.relation, is_known: true },
    }).unwrap();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold">Label unknown person</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Mark this unknown face as a known person.
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-3">
          <FormField label="Full name" error={errors.name?.message} htmlFor="l-name" required>
            <Input id="l-name" placeholder="Rahul Singh" {...register("name")} />
          </FormField>
          <FormField label="Relation" error={errors.relation?.message} htmlFor="l-relation" required>
            <Input id="l-relation" placeholder="Son" {...register("relation")} />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={isLoading}>
              {isLoading ? <><Loader2 className="animate-spin" /> Saving…</> : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Person Row ───────────────────────────────────────────────────────────────
function PersonRow({
  person,
  patientId,
}: {
  person: Person;
  patientId: number;
}) {
  const [deletePerson, { isLoading: deleting }] = useDeletePersonMutation();
  const [showLabel, setShowLabel] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const handleDelete = async () => {
    if (!confirmDel) { setConfirmDel(true); return; }
    await deletePerson({ patientId, personId: person.id }).unwrap();
  };

  return (
    <>
      <div className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-foreground/20">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            person.is_known ? "bg-foreground/10" : "bg-amber-500/10"
          )}>
            {person.is_known
              ? <UserCheck className="size-4 text-foreground" />
              : <UserX className="size-4 text-amber-600" />
            }
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {person.is_known
                ? (person.name ?? "—")
                : <span className="text-amber-600 italic">Unknown person</span>
              }
            </p>
            {person.relation && (
              <p className="text-xs text-muted-foreground capitalize">{person.relation}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {!person.is_known && (
            <button
              onClick={() => setShowLabel(true)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-500/10 transition-colors"
              title="Label this person"
            >
              <Pencil className="size-3.5" /> Label
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              confirmDel
                ? "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                : "text-muted-foreground hover:bg-muted hover:text-destructive"
            )}
            title={confirmDel ? "Click again to confirm" : "Delete"}
          >
            {deleting
              ? <Loader2 className="size-4 animate-spin" />
              : <Trash2 className="size-4" />
            }
          </button>
        </div>
      </div>

      {showLabel && (
        <LabelUnknownModal
          patientId={patientId}
          person={person}
          onClose={() => setShowLabel(false)}
        />
      )}
    </>
  );
}

// ─── Patient Detail Page ──────────────────────────────────────────────────────
export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const patientId = Number(id);
  const navigate = useNavigate();

  const { data: patientData, isLoading: loadingPatient } = useGetPatientQuery(patientId);
  const { data: personsData, isLoading: loadingPersons } = useGetPersonsQuery(patientId);
  const [showAddFace, setShowAddFace] = useState(false);

  const patient = patientData?.data;
  const persons = personsData?.data ?? [];
  const known   = persons.filter((p) => p.is_known);
  const unknown = persons.filter((p) => !p.is_known);

  if (loadingPatient) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <AlertCircle className="size-8 text-muted-foreground" />
        <p className="text-muted-foreground">Patient not found.</p>
        <Button variant="ghost" size="sm" onClick={() => navigate("/patients")}>
          <ArrowLeft className="size-4" /> Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/patients" className="hover:text-foreground transition-colors">Patients</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{patient.name}</span>
      </div>

      {/* Patient header */}
      <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-foreground text-background">
            <User2 className="size-7" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{patient.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
              {patient.age && <span>{patient.age} years old</span>}
              {patient.diagnosis_level && (
                <span className="capitalize font-medium text-foreground">
                  {patient.diagnosis_level} dementia
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/recognition/${patientId}`)}
          >
            <ScanFace className="size-4" /> Run Recognition
          </Button>
          <Button size="sm" onClick={() => setShowAddFace(true)}>
            <Plus className="size-4" /> Add face
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-2xl font-semibold">{persons.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total persons</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-2xl font-semibold text-emerald-600">{known.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Known faces</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-2xl font-semibold text-amber-600">{unknown.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Unknown faces</p>
        </div>
      </div>

      {loadingPersons ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Known persons */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <UserCheck className="size-4 text-emerald-600" /> Known persons
                <span className="ml-1 text-muted-foreground font-normal">({known.length})</span>
              </h2>
            </div>
            {known.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">No known persons registered yet.</p>
                <button
                  onClick={() => setShowAddFace(true)}
                  className="mt-2 text-sm font-medium underline underline-offset-4 hover:opacity-70 transition-opacity"
                >
                  Add a face
                </button>
              </div>
            ) : (
              <div className="grid gap-2">
                {known.map((p) => (
                  <PersonRow key={p.id} person={p} patientId={patientId} />
                ))}
              </div>
            )}
          </section>

          {/* Unknown faces */}
          {unknown.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
                <UserX className="size-4 text-amber-600" /> Unknown faces
                <span className="ml-1 text-muted-foreground font-normal">({unknown.length})</span>
              </h2>
              <div className="grid gap-2">
                {unknown.map((p) => (
                  <PersonRow key={p.id} person={p} patientId={patientId} />
                ))}
              </div>
            </section>
          )}

          {persons.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
              <CheckCircle2 className="size-8 text-muted-foreground" />
              <div>
                <p className="font-medium">No faces registered</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Register known people so the system can recognise them.
                </p>
              </div>
              <Button size="sm" onClick={() => setShowAddFace(true)}>
                <Plus className="size-4" /> Add first face
              </Button>
            </div>
          )}
        </div>
      )}

      {showAddFace && (
        <AddFaceModal patientId={patientId} onClose={() => setShowAddFace(false)} />
      )}
    </div>
  );
}

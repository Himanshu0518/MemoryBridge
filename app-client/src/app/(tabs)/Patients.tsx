import React, { useState } from "react";
import {
    View,
    ScrollView,
    TouchableOpacity,
    Modal,
    TextInput,
    ActivityIndicator,
    StyleSheet,
    Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import {
    PlusIcon,
    UserIcon,
    ChevronRightIcon,
    TrashIcon,
    ExclamationTriangleIcon,
    CpuChipIcon,
    ChartBarIcon,
} from "react-native-heroicons/outline";
import { Text } from "@/components/ui/text";
import { Blob } from "@/components/ui/blob";
import {
    useGetPatientsQuery,
    useCreatePatientMutation,
    useDeletePatientMutation,
} from "@/services/patientApi";
import type { Patient } from "@/types";

// ─── Diagnosis badge colors ───────────────────────────────────────────────────
const diagnosisColors: Record<string, { bg: string; text: string; border: string }> = {
    mild: { bg: "#ECFDF5", text: "#059669", border: "#A7F3D0" },
    moderate: { bg: "#FFFBEB", text: "#D97706", border: "#FDE68A" },
    severe: { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA" },
};

function DiagnosisBadge({ level }: { level: string | null }) {
    if (!level) return null;
    const c = diagnosisColors[level] ?? { bg: "#F1F5F9", text: "#6B7897", border: "#E2E8F0" };
    return (
        <View
            className="rounded-full px-2 py-0.5"
            style={{ backgroundColor: c.bg, borderWidth: 1, borderColor: c.border }}
        >
            <Text className="text-xs font-medium capitalize" style={{ color: c.text }}>
                {level}
            </Text>
        </View>
    );
}

// ─── Add Patient Modal ────────────────────────────────────────────────────────
function AddPatientModal({ onClose }: { onClose: () => void }) {
    const [createPatient, { isLoading }] = useCreatePatientMutation();

    const [name, setName] = useState("");
    const [age, setAge] = useState("");
    const [diagnosis, setDiagnosis] = useState<"" | "mild" | "moderate" | "severe">("");
    const [errors, setErrors] = useState<{ name?: string; age?: string }>({});
    const [serverError, setServerError] = useState<string | null>(null);

    const validate = (): boolean => {
        const next: typeof errors = {};
        if (name.trim().length < 2) next.name = "Name must be at least 2 characters";
        if (age && (isNaN(Number(age)) || Number(age) < 0 || Number(age) > 120)) {
            next.age = "Enter an age between 0 and 120";
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const onSubmit = async () => {
        setServerError(null);
        if (!validate()) return;
        try {
            await createPatient({
                name: name.trim(),
                ...(age ? { age: Number(age) } : {}),
                ...(diagnosis ? { diagnosis_level: diagnosis } : {}),
            }).unwrap();
            onClose();
        } catch (err: unknown) {
            const msg =
                err && typeof err === "object" && "data" in err
                    ? String((err.data as Record<string, unknown>)?.message ?? "Failed to create patient")
                    : "Failed to create patient";
            setServerError(msg);
        }
    };

    const levels: { value: "" | "mild" | "moderate" | "severe"; label: string }[] = [
        { value: "", label: "— Select —" },
        { value: "mild", label: "Mild" },
        { value: "moderate", label: "Moderate" },
        { value: "severe", label: "Severe" },
    ];

    return (
        <Modal transparent animationType="fade" onRequestClose={onClose}>
            <View className="flex-1 items-center justify-center bg-black/40 p-4">
                <Pressable className="absolute inset-0" onPress={onClose} />
                <View className="w-full rounded-2xl bg-white" style={styles.modalShadow}>
                    <View className="border-b border-border px-6 py-4">
                        <Text className="text-base font-semibold text-foreground">Add new patient</Text>
                        <Text className="mt-0.5 text-sm text-muted-foreground">
                            Create a new dementia patient profile.
                        </Text>
                    </View>

                    <View className="gap-4 px-6 py-5">
                        {serverError && (
                            <View className="flex-row items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
                                <ExclamationTriangleIcon size={16} color="#DC2626" />
                                <Text className="flex-1 text-sm text-destructive">{serverError}</Text>
                            </View>
                        )}

                        <View>
                            <Text className="mb-1.5 text-sm font-medium text-foreground">
                                Full name <Text className="text-destructive">*</Text>
                            </Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Ramesh Kumar"
                                value={name}
                                onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: undefined })); }}
                                autoCapitalize="words"
                            />
                            {errors.name && <Text className="mt-1 text-xs text-destructive">{errors.name}</Text>}
                        </View>

                        <View className="flex-row gap-3">
                            <View className="flex-1">
                                <Text className="mb-1.5 text-sm font-medium text-foreground">Age</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="72"
                                    value={age}
                                    onChangeText={(t) => { setAge(t); setErrors((e) => ({ ...e, age: undefined })); }}
                                    keyboardType="number-pad"
                                    maxLength={3}
                                />
                                {errors.age && <Text className="mt-1 text-xs text-destructive">{errors.age}</Text>}
                            </View>
                            <View className="flex-1">
                                <Text className="mb-1.5 text-sm font-medium text-foreground">Diagnosis level</Text>
                                <View className="flex-row gap-1.5">
                                    {levels.slice(1).map((l) => (
                                        <TouchableOpacity
                                            key={l.value}
                                            onPress={() => setDiagnosis(diagnosis === l.value ? "" : (l.value as "mild" | "moderate" | "severe"))}
                                            className="flex-1 rounded-lg border py-2"
                                            style={{
                                                borderColor: diagnosis === l.value ? "#208AEF" : "#E2E8F0",
                                                backgroundColor: diagnosis === l.value ? "#208AEF18" : "#FFFFFF",
                                            }}
                                        >
                                            <Text
                                                className="text-center text-xs font-semibold capitalize"
                                                style={{ color: diagnosis === l.value ? "#208AEF" : "#6B7897" }}
                                            >
                                                {l.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>

                        <View className="flex-row justify-end gap-2 pt-2">
                            <TouchableOpacity onPress={onClose} className="rounded-xl border border-border px-4 py-2.5">
                                <Text className="text-sm font-semibold text-muted-foreground">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={onSubmit}
                                disabled={isLoading}
                                className="flex-row items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 disabled:opacity-60"
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text className="text-sm font-semibold text-white">Create patient</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─── Patient Card ─────────────────────────────────────────────────────────────
function PatientCard({ patient }: { patient: Patient }) {
    const router = useRouter();
    const [deletePatient, { isLoading: deleting }] = useDeletePatientMutation();
    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleDelete = async () => {
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }
        try {
            await deletePatient(patient.id).unwrap();
        } catch (err) {
            console.warn("[Patients] Delete failed:", err);
        }
    };

    return (
        <TouchableOpacity
            onPress={() => router.push(`/(tabs)/PatientDetail?patientId=${patient.id}`)}
            activeOpacity={0.7}
            className="flex-row items-center justify-between rounded-2xl border border-border bg-white p-4"
        >
            {/* Left */}
            <View className="min-w-0 flex-1 flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <UserIcon size={20} color="#6B7897" strokeWidth={1.75} />
                </View>
                <View className="min-w-0 flex-1">
                    <Text className="font-medium text-foreground" numberOfLines={1}>
                        {patient.name}
                    </Text>
                    <View className="mt-0.5 flex-row items-center gap-2">
                        {patient.age != null && (
                            <Text className="text-xs text-muted-foreground">{patient.age} yrs</Text>
                        )}
                        <DiagnosisBadge level={patient.diagnosis_level} />
                    </View>
                </View>
            </View>

            {/* Right */}
            <View className="ml-2 flex-row items-center gap-1.5">
                <TouchableOpacity
                    onPress={handleDelete}
                    disabled={deleting}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    className={confirmDelete ? "rounded-lg bg-destructive/10 p-1.5" : "rounded-lg p-1.5"}
                >
                    {deleting ? (
                        <ActivityIndicator size="small" color="#6B7897" />
                    ) : (
                        <TrashIcon size={16} color={confirmDelete ? "#DC2626" : "#6B7897"} strokeWidth={1.75} />
                    )}
                </TouchableOpacity>
                <ChevronRightIcon size={16} color="#6B7897" strokeWidth={2} />
            </View>
        </TouchableOpacity>
    );
}

// ─── Patients Screen ──────────────────────────────────────────────────────────
export default function Patients() {
    const router = useRouter();
    const { data, isLoading, isError, refetch } = useGetPatientsQuery();
    const [showAdd, setShowAdd] = useState(false);
    const patients = data?.data ?? [];

    return (
        <View style={styles.flex} className="bg-background">
            <Blob color="#8B5CF6" size={240} style={{ top: -70, right: -70 }} opacity={0.08} />

            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View className="flex-row items-center gap-3 px-6 pb-4 pt-16">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="rounded-full bg-muted p-2"
                    >
                        <ChevronRightIcon size={18} color="#6B7897" strokeWidth={2} style={{ transform: [{ rotate: "180deg" }] }} />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-2xl font-bold text-foreground">Patients</Text>
                        <Text className="text-sm text-muted-foreground">
                            Manage your dementia patient profiles.
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => setShowAdd(true)}
                        className="flex-row items-center gap-1 rounded-xl bg-primary px-3 py-2.5"
                    >
                        <PlusIcon size={16} color="#FFFFFF" strokeWidth={2.5} />
                        <Text className="text-sm font-semibold text-white">Add</Text>
                    </TouchableOpacity>
                </View>

                {/* States */}
                {isLoading && (
                    <View className="items-center justify-center py-20">
                        <ActivityIndicator size="large" color="#208AEF" />
                    </View>
                )}

                {isError && (
                    <View className="mx-6 flex-row items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
                        <ExclamationTriangleIcon size={16} color="#DC2626" />
                        <Text className="flex-1 text-sm text-destructive">
                            Failed to load patients.
                        </Text>
                        <TouchableOpacity onPress={() => refetch()}>
                            <Text className="text-sm font-semibold text-primary">Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {!isLoading && !isError && patients.length === 0 && (
                    <View className="mx-6 items-center gap-3 rounded-2xl border border-dashed border-border py-16">
                        <View className="h-12 w-12 items-center justify-center rounded-full bg-muted">
                            <CpuChipIcon size={24} color="#6B7897" strokeWidth={1.75} />
                        </View>
                        <Text className="font-medium text-foreground">No patients yet</Text>
                        <Text className="text-sm text-muted-foreground">
                            Add your first patient to get started.
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowAdd(true)}
                            className="flex-row items-center gap-1 rounded-xl bg-primary px-4 py-2.5"
                        >
                            <PlusIcon size={16} color="#FFFFFF" strokeWidth={2.5} />
                            <Text className="text-sm font-semibold text-white">Add patient</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {patients.length > 0 && (
                    <View className="gap-2 px-6">
                        {/* Stats bar */}
                        <View className="mb-4 flex-row gap-2">
                            {(["mild", "moderate", "severe"] as const).map((level) => {
                                const count = patients.filter((p) => p.diagnosis_level === level).length;
                                return (
                                    <View
                                        key={level}
                                        className="flex-1 rounded-xl border border-border bg-white px-3 py-2.5"
                                    >
                                        <Text className="text-xl font-semibold text-foreground">{count}</Text>
                                        <View className="mt-0.5 flex-row items-center gap-1">
                                            <ChartBarIcon size={10} color="#6B7897" strokeWidth={2} />
                                            <Text className="text-xs capitalize text-muted-foreground">{level}</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>

                        {/* Cards */}
                        <View className="gap-2">
                            {patients.map((p) => (
                                <PatientCard key={p.id} patient={p} />
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>

            {showAdd && <AddPatientModal onClose={() => setShowAdd(false)} />}
        </View>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    scroll: { flexGrow: 1, paddingBottom: 24 },
    modalShadow: {
        shadowColor: "#0C0F1A",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
        elevation: 12,
    },
    textInput: {
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 12,
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        color: "#0C0F1A",
    },
});

import React, { useState } from "react";
import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import {
    ArrowLeftIcon,
    MicrophoneIcon,
    CpuChipIcon,
    ChevronRightIcon,
    UserGroupIcon,
} from "react-native-heroicons/outline";
import { Text } from "@/components/ui/text";
import { useGetPatientsQuery } from "@/services/patientApi";
import { useStartPatientSessionMutation } from "@/services/patientSessionApi";

/**
 * Transcribe hub — pick a patient to open Patient Mode, where live
 * transcription runs after face recognition (mirrors the web flow where
 * transcription lives inside patient mode).
 */
export default function Transcribe() {
    const router = useRouter();
    const { data } = useGetPatientsQuery();
    const patients = data?.data ?? [];
    const [selected, setSelected] = useState<number | null>(null);
    const [startPatientSession, { isLoading: starting }] = useStartPatientSessionMutation();

    const handleStartSession = async () => {
        if (!selected) return;
        try {
            // Open the patient-scoped session (same endpoint as web's
            // "Switch to patient") — the store listener dispatches sessionOpened.
            await startPatientSession(selected).unwrap();
            router.replace("/(patient-mode)/PatientMode");
        } catch (err) {
            console.warn("[Transcribe] Failed to start patient session:", err);
        }
    };

    return (
        <View style={styles.flex} className="bg-background">
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View className="flex-row items-center gap-3 px-6 pb-4 pt-16">
                    <TouchableOpacity onPress={() => router.back()} className="rounded-full bg-muted p-2">
                        <ArrowLeftIcon size={18} color="#6B7897" strokeWidth={2} />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-2xl font-bold text-foreground">Transcribe</Text>
                        <Text className="text-sm text-muted-foreground">
                            Live AI-summarized conversation notes
                        </Text>
                    </View>
                </View>

                {/* AI banner */}
                <View className="mx-6 mb-6 rounded-2xl px-5 py-5" style={styles.banner}>
                    <View className="mb-2 flex-row items-center gap-2">
                        <CpuChipIcon size={16} color="#208AEF" strokeWidth={2} />
                        <Text className="text-sm font-semibold text-primary">How it works</Text>
                    </View>
                    <Text className="text-sm leading-5 text-foreground">
                        Open a patient’s session, scan their visitor’s face, and the conversation is
                        transcribed live and summarized by AI — so your patient always has context.
                    </Text>
                </View>

                {/* Patient picker */}
                <View className="px-6">
                    <Text className="mb-3 text-lg font-bold text-foreground">Select patient</Text>
                    {patients.length === 0 ? (
                        <View className="items-center gap-3 rounded-2xl border border-dashed border-border py-12">
                            <UserGroupIcon size={32} color="#6B7897" strokeWidth={1.5} />
                            <Text className="text-sm text-muted-foreground">No patients yet.</Text>
                            <TouchableOpacity
                                onPress={() => router.push("/(tabs)/Patients")}
                                className="rounded-xl bg-primary px-4 py-2.5"
                            >
                                <Text className="text-sm font-semibold text-white">Go to Patients</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View className="gap-2">
                            {patients.map((p) => (
                                <TouchableOpacity
                                    key={p.id}
                                    onPress={() => setSelected(p.id)}
                                    className="flex-row items-center justify-between rounded-2xl border bg-white px-4 py-3.5"
                                    style={{ borderColor: selected === p.id ? "#208AEF" : "#E2E8F0" }}
                                >
                                    <View className="flex-row items-center gap-3">
                                        <View className="h-10 w-10 items-center justify-center rounded-full bg-foreground">
                                            <Text className="text-sm font-bold text-white">
                                                {p.name.charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View>
                                            <Text className="font-medium text-foreground">{p.name}</Text>
                                            <Text className="text-xs capitalize text-muted-foreground">
                                                {p.age ? `${p.age} yrs` : ""}
                                                {p.age && p.diagnosis_level ? " · " : ""}
                                                {p.diagnosis_level ? `${p.diagnosis_level} dementia` : ""}
                                            </Text>
                                        </View>
                                    </View>
                                    <ChevronRightIcon size={16} color="#6B7897" strokeWidth={2} />
                                </TouchableOpacity>
                            ))}

                            {selected && (
                                <TouchableOpacity
                                    onPress={handleStartSession}
                                    disabled={starting}
                                    className="mt-2 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3.5 disabled:opacity-60"
                                >
                                    {starting ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <MicrophoneIcon size={18} color="#FFFFFF" strokeWidth={2} />
                                    )}
                                    <Text className="text-sm font-semibold text-white">
                                        {starting ? "Starting…" : "Start session"}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>

                <View className="h-10" />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    scroll: { flexGrow: 1, paddingBottom: 24 },
    banner: {
        backgroundColor: "#EBF4FE",
        borderWidth: 1,
        borderColor: "#D6EBFC",
    },
});

import React from "react";
import { View, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import {
    ArrowLeftIcon,
    MapPinIcon,
    UserGroupIcon,
    ClockIcon,
} from "react-native-heroicons/outline";
import { Text } from "@/components/ui/text";
import { useGetPatientsQuery, useGetLocationsQuery } from "@/services/patientApi";
import type { TrackingLocation } from "@/types";

function formatTime(iso: string) {
    const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
    return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, "0")}:${String(
        d.getMinutes()
    ).padStart(2, "0")}`;
}

/** Latest locations card for a single patient. */
function PatientLocationCard({ patientId, name }: { patientId: number; name: string }) {
    const { data: locations, isLoading } = useGetLocationsQuery(patientId);
    const latest: TrackingLocation | undefined = locations?.[0];
    const coords = latest
        ? `${latest.latitude.toFixed(5)}, ${latest.longitude.toFixed(5)}`
        : null;

    return (
        <View className="rounded-2xl border border-border bg-white p-4">
            <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                    <MapPinIcon size={20} color="#F59E0B" strokeWidth={1.75} />
                </View>
                <View className="min-w-0 flex-1">
                    <Text className="font-medium text-foreground">{name}</Text>
                    {isLoading ? (
                        <Text className="text-xs text-muted-foreground">Loading locations…</Text>
                    ) : coords ? (
                        <>
                            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                                {coords}
                            </Text>
                            <View className="mt-0.5 flex-row items-center gap-1">
                                <ClockIcon size={10} color="#6B7897" strokeWidth={2} />
                                <Text className="text-[10px] text-muted-foreground">
                                    Updated {formatTime(latest!.timestamp)}
                                </Text>
                            </View>
                        </>
                    ) : (
                        <Text className="text-xs text-muted-foreground">
                            No location recorded yet
                        </Text>
                    )}
                </View>
            </View>

            {/* Recent trail */}
            {locations && locations.length > 1 && (
                <View className="mt-3 border-t border-border pt-3">
                    <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Recent trail ({locations.length})
                    </Text>
                    {locations.slice(0, 3).map((loc) => (
                        <View key={loc.id} className="mb-1 flex-row items-center justify-between">
                            <Text className="flex-1 text-xs text-muted-foreground" numberOfLines={1}>
                                {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                            </Text>
                            <Text className="text-[10px] text-muted-foreground/70">
                                {formatTime(loc.timestamp)}
                            </Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

export default function Tracking() {
    const router = useRouter();
    const { data, isLoading } = useGetPatientsQuery();
    const patients = data?.data ?? [];

    return (
        <View style={styles.flex} className="bg-background">
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View className="flex-row items-center gap-3 px-6 pb-4 pt-16">
                    <TouchableOpacity onPress={() => router.back()} className="rounded-full bg-muted p-2">
                        <ArrowLeftIcon size={18} color="#6B7897" strokeWidth={2} />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-2xl font-bold text-foreground">Tracking</Text>
                        <Text className="text-sm text-muted-foreground">
                            Monitor patient location history
                        </Text>
                    </View>
                </View>

                {isLoading && (
                    <Text className="px-6 text-sm text-muted-foreground">Loading…</Text>
                )}

                {!isLoading && patients.length === 0 && (
                    <View className="mx-6 items-center gap-3 rounded-2xl border border-dashed border-border py-12">
                        <UserGroupIcon size={32} color="#6B7897" strokeWidth={1.5} />
                        <Text className="text-sm text-muted-foreground">No patients yet.</Text>
                        <TouchableOpacity
                            onPress={() => router.push("/(tabs)/Patients")}
                            className="rounded-xl bg-primary px-4 py-2.5"
                        >
                            <Text className="text-sm font-semibold text-white">Go to Patients</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View className="gap-3 px-6">
                    {patients.map((p) => (
                        <PatientLocationCard key={p.id} patientId={p.id} name={p.name} />
                    ))}
                </View>

                <Text className="mt-6 px-8 text-center text-xs leading-5 text-muted-foreground">
                    Locations are recorded automatically while a patient session is active on the
                    device.
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    scroll: { flexGrow: 1, paddingBottom: 24 },
});

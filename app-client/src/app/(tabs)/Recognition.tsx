import { useState, useCallback, useRef } from "react";
import {
    View,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Image,
    ScrollView,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
    ArrowLeftIcon,
    ViewfinderCircleIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    UserIcon,
    CheckBadgeIcon,
    ArrowPathIcon,
} from "react-native-heroicons/outline";
import { Text } from "@/components/ui/text";
import { useGetPatientQuery } from "@/services/patientApi";
import { useMatchFaceMutation } from "@/services/recognitionApi";
import { BASE_URL } from "@/services/api";
import type { MatchFaceData } from "@/types";

// ─── Match Result UI ──────────────────────────────────────────────────────────
function MatchResult({
    result,
    onRetry,
}: {
    result: { success: boolean; message: string; data?: MatchFaceData };
    onRetry: () => void;
}) {
    const data = result.data;

    // No face detected
    if (!data || ("error" in data && data.error === "no_face_detected")) {
        return (
            <View className="items-center gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 px-6 py-8">
                <View className="h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
                    <ExclamationTriangleIcon size={28} color="#D97706" strokeWidth={1.75} />
                </View>
                <View>
                    <Text className="font-semibold text-foreground">No face detected</Text>
                    <Text className="mt-1 text-center text-sm text-muted-foreground">
                        Make sure the face is clearly visible, well-lit, and centred in the frame.
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={onRetry}
                    className="flex-row items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5"
                >
                    <ArrowPathIcon size={16} color="#FFFFFF" strokeWidth={2} />
                    <Text className="text-sm font-semibold text-white">Try again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Recognised
    if ("recognised" in data && data.recognised) {
        const similarity = Math.round(data.similarity * 100);
        return (
            <View className="items-center gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-6 py-8">
                <View className="relative">
                    {data.image_url ? (
                        <Image
                            source={{ uri: data.image_url.startsWith("http") ? data.image_url : `${API_BASE}${data.image_url}` }}
                            className="h-16 w-16 rounded-full"
                            style={{ resizeMode: "cover" }}
                        />
                    ) : (
                        <View className="h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                            <CheckBadgeIcon size={32} color="#059669" strokeWidth={1.75} />
                        </View>
                    )}
                    <View className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
                        <CheckCircleIcon size={14} color="#FFFFFF" strokeWidth={2.5} />
                    </View>
                </View>
                <View>
                    <Text className="mb-1 text-xs font-medium uppercase tracking-widest text-emerald-600">
                        Recognised
                    </Text>
                    <Text className="text-2xl font-semibold text-foreground">{data.name}</Text>
                    <Text className="mt-0.5 text-sm capitalize text-muted-foreground">{data.relation}</Text>
                </View>
                <View className="w-full max-w-[220px]">
                    <View className="mb-1 flex-row justify-between">
                        <Text className="text-xs text-muted-foreground">Confidence</Text>
                        <Text className="text-xs font-medium text-foreground">{similarity}%</Text>
                    </View>
                    <View className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <View
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${similarity}%` }}
                        />
                    </View>
                </View>
                <TouchableOpacity
                    onPress={onRetry}
                    className="flex-row items-center gap-1.5 rounded-xl border border-border bg-white px-5 py-2.5"
                >
                    <ViewfinderCircleIcon size={16} color="#0C0F1A" strokeWidth={2} />
                    <Text className="text-sm font-semibold text-foreground">Scan again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Unknown
    return (
        <View className="items-center gap-4 rounded-2xl border border-border bg-white px-6 py-8">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-muted">
                <UserIcon size={28} color="#6B7897" strokeWidth={1.75} />
            </View>
            <View>
                <Text className="font-semibold text-foreground">Person not recognised</Text>
                <Text className="mt-1 text-center text-sm text-muted-foreground">
                    This face has been saved as an unknown person. You can label them from the patient
                    profile.
                </Text>
            </View>
            <TouchableOpacity
                onPress={onRetry}
                className="flex-row items-center gap-1.5 rounded-xl border border-border px-5 py-2.5"
            >
                <ViewfinderCircleIcon size={16} color="#0C0F1A" strokeWidth={2} />
                <Text className="text-sm font-semibold text-foreground">Try again</Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── Camera Scanner ───────────────────────────────────────────────────────────
function CameraScanner({
    patientId,
    onResult,
}: {
    patientId: number;
    onResult: (r: { success: boolean; message: string; data?: MatchFaceData }) => void;
}) {
    const cameraRef = useRef<CameraView>(null);
    const [permission, requestPermission] = useCameraPermissions();
    const [camActive, setCamActive] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [matchFace] = useMatchFaceMutation();

    const capture = useCallback(async () => {
        if (!cameraRef.current) return;
        setScanning(true);
        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.92,
                imageType: "jpg",
                exif: false,
            });
            if (!photo?.uri) throw new Error("capture failed");
            // RN FormData file shape
            const file = {
                uri: photo.uri,
                name: "capture.jpg",
                type: "image/jpeg",
            } as unknown as File;
            const res = await matchFace({ patientId, file }).unwrap();
            onResult(res as { success: boolean; message: string; data?: MatchFaceData });
        } catch {
            onResult({
                success: false,
                message: "Recognition failed.",
                data: { recognised: false },
            });
        } finally {
            setScanning(false);
            setCountdown(null);
        }
    }, [patientId, matchFace, onResult]);

    // 3-2-1 countdown then capture
    const startCountdown = useCallback(() => {
        let c = 3;
        setCountdown(c);
        const iv = setInterval(() => {
            c--;
            if (c === 0) {
                clearInterval(iv);
                setCountdown(null);
                capture();
            } else {
                setCountdown(c);
            }
        }, 1000);
    }, [capture]);

    if (!permission) {
        return <View style={styles.flex} />;
    }

    if (!permission.granted) {
        return (
            <View className="items-center gap-4 rounded-2xl bg-black/90 px-6 py-10">
                <ExclamationTriangleIcon size={32} color="#FFFFFF88" strokeWidth={1.5} />
                <Text className="text-center text-sm text-white/70">
                    Camera access is required to scan faces.
                </Text>
                <TouchableOpacity
                    onPress={requestPermission}
                    className="rounded-xl bg-white px-5 py-2.5"
                >
                    <Text className="text-sm font-semibold text-black">Grant permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="gap-4">
            {/* Viewport */}
            <View className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
                {camActive && (
                    <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />
                )}

                {/* Scan frame overlay */}
                {camActive && !scanning && countdown === null && (
                    <View className="pointer-events-none absolute inset-0 items-center justify-center">
                        <View className="relative h-48 w-40">
                            {(["tl", "tr", "bl", "br"] as const).map((p) => (
                                <View
                                    key={p}
                                    className="absolute h-5 w-5 border-white/70"
                                    style={{
                                        borderTopWidth: p === "tl" || p === "tr" ? 2.5 : 0,
                                        borderBottomWidth: p === "bl" || p === "br" ? 2.5 : 0,
                                        borderLeftWidth: p === "tl" || p === "bl" ? 2.5 : 0,
                                        borderRightWidth: p === "tr" || p === "br" ? 2.5 : 0,
                                        borderTopLeftRadius: p === "tl" ? 8 : 0,
                                        borderTopRightRadius: p === "tr" ? 8 : 0,
                                        borderBottomLeftRadius: p === "bl" ? 8 : 0,
                                        borderBottomRightRadius: p === "br" ? 8 : 0,
                                        top: p === "tl" || p === "tr" ? 0 : undefined,
                                        bottom: p === "bl" || p === "br" ? 0 : undefined,
                                        left: p === "tl" || p === "bl" ? 0 : undefined,
                                        right: p === "tr" || p === "br" ? 0 : undefined,
                                    }}
                                />
                            ))}
                        </View>
                    </View>
                )}

                {/* LIVE badge */}
                {camActive && (
                    <View className="absolute left-3 top-3 flex-row items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1">
                        <View className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                        <Text className="text-[10px] font-semibold text-white">LIVE</Text>
                    </View>
                )}

                {/* Countdown overlay */}
                {countdown !== null && (
                    <View className="absolute inset-0 items-center justify-center">
                        <View className="h-20 w-20 items-center justify-center rounded-2xl bg-black/70">
                            <Text className="text-5xl font-black text-white">{countdown}</Text>
                        </View>
                    </View>
                )}

                {/* Scanning overlay */}
                {scanning && (
                    <View className="absolute inset-0 items-center justify-center gap-3 bg-black/60">
                        <ActivityIndicator size="large" color="#FFFFFF" />
                        <Text className="text-sm font-semibold text-white/90">Analysing face…</Text>
                    </View>
                )}
            </View>

            {/* Controls */}
            <View className="flex-row gap-2">
                {camActive ? (
                    <>
                        <TouchableOpacity
                            onPress={startCountdown}
                            disabled={scanning || countdown !== null}
                            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-foreground py-3.5 disabled:opacity-40"
                        >
                            {scanning ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : countdown !== null ? (
                                <>
                                    <Text className="text-sm font-semibold text-white">
                                        Capturing in {countdown}…
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <ViewfinderCircleIcon size={16} color="#FFFFFF" strokeWidth={2} />
                                    <Text className="text-sm font-semibold text-white">Scan face</Text>
                                </>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setCamActive(false)}
                            disabled={scanning}
                            className="rounded-xl border border-border bg-white px-4 py-3.5 disabled:opacity-40"
                        >
                            <Text className="text-sm font-semibold text-muted-foreground">Stop</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity
                        onPress={() => setCamActive(true)}
                        className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-foreground py-3.5"
                    >
                        <ViewfinderCircleIcon size={16} color="#FFFFFF" strokeWidth={2} />
                        <Text className="text-sm font-semibold text-white">Start camera</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const API_BASE = BASE_URL;

// ─── Recognition Screen ───────────────────────────────────────────────────────
export default function Recognition() {
    const router = useRouter();
    const params = useLocalSearchParams<{ patientId?: string }>();
    const pid = Number(params.patientId);
    const { data: patientData, isLoading } = useGetPatientQuery(pid);
    const patient = patientData?.data;

    const [result, setResult] = useState<{
        success: boolean;
        message: string;
        data?: MatchFaceData;
    } | null>(null);

    const handleResult = (r: typeof result) => setResult(r);
    const handleRetry = () => setResult(null);

    if (isLoading) {
        return (
            <View style={styles.flex} className="items-center justify-center bg-background">
                <ActivityIndicator size="large" color="#208AEF" />
            </View>
        );
    }

    return (
        <View style={styles.flex} className="bg-background">
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View className="flex-row items-center gap-3 px-6 pb-4 pt-16">
                    <TouchableOpacity onPress={() => router.back()} className="rounded-full bg-muted p-2">
                        <ArrowLeftIcon size={18} color="#6B7897" strokeWidth={2} />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-2xl font-bold text-foreground">Face Recognition</Text>
                        {patient && (
                            <Text className="text-sm text-muted-foreground">
                                Identifying visitors for{" "}
                                <Text className="font-medium text-foreground">{patient.name}</Text>
                            </Text>
                        )}
                    </View>
                </View>

                <View className="gap-5 px-6">
                    {/* Result or Scanner */}
                    {result ? (
                        <MatchResult result={result} onRetry={handleRetry} />
                    ) : (
                        <CameraScanner patientId={pid} onResult={handleResult} />
                    )}

                    {/* Hint */}
                    <View className="rounded-xl border border-border bg-white px-4 py-3">
                        <Text className="text-xs leading-relaxed text-muted-foreground">
                            Position the visitor’s face inside the frame and tap {" "}
                            <Text className="font-semibold">Scan face</Text>. Recognised visitors are
                            announced; unknown faces are stored so you can label them later.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    scroll: { flexGrow: 1, paddingBottom: 24 },
});

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
    View,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Image,
    KeyboardAvoidingView,
    Platform,
    TextInput,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { useRouter } from "expo-router";
import {
    CpuChipIcon,
    ViewfinderCircleIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    UserIcon,
    CheckBadgeIcon,
    ArrowPathIcon,
    MicrophoneIcon,
    StopCircleIcon,
    ChatBubbleLeftRightIcon,
    ClockIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    PaperAirplaneIcon,
    BellIcon,
    HeartIcon,
    ArrowLeftIcon,
    LockClosedIcon,
} from "react-native-heroicons/outline";
import { Text } from "@/components/ui/text";
import { useAppSelector } from "@/store/hooks";
import { selectPatientSession } from "@/store/selectors";
import {
    useMatchFaceMutation,
    useSuggestIdentityMutation,
} from "@/services/recognitionApi";
import {
    useGetConversationsForPersonQuery,
} from "@/services/transcriptionApi";
import { useRecordLocationMutation } from "@/services/patientApi";
import { useVerifyCaregiverMutation } from "@/services/userApi";
import { useExitPatientSessionMutation } from "@/services/patientSessionApi";
import { useTranscription } from "@/hooks/useTranscription";
import { BASE_URL } from "@/services/api";
import type { MatchFaceData } from "@/types";

const API_BASE = BASE_URL;

function imageUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    return url.startsWith("http") ? url : `${API_BASE}${url}`;
}

function extractError(err: unknown, fallback: string): string {
    if (err && typeof err === "object" && "data" in err) {
        const msg = (err.data as Record<string, unknown>)?.message;
        if (msg) return String(msg);
    }
    return fallback;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toUtc(iso: string) {
    return iso.endsWith("Z") ? iso : iso + "Z";
}

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(toUtc(iso)).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

function formatDate(iso: string) {
    const d = new Date(toUtc(iso));
    return `${d.getDate()} ${d.toLocaleString("en", { month: "short" })} ${d.getFullYear()}, ${String(
        d.getHours()
    ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const RELATION_COLORS: Record<string, string> = {
    son: "#3B82F618",
    daughter: "#EC489918",
    wife: "#F4355C18",
    husband: "#F9731618",
    doctor: "#10B98118",
    nurse: "#14B8A618",
    friend: "#8B5CF618",
};

// ─── Suggest identity form (shown when face is not recognised) ────────────────
function SuggestIdentityForm({
    unknownPersonId,
    patientId,
    onRetry,
    onContinue,
}: {
    unknownPersonId: number;
    patientId: number;
    onRetry: () => void;
    onContinue: () => void;
}) {
    const [name, setName] = useState("");
    const [relation, setRelation] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [suggestIdentity, { isLoading }] = useSuggestIdentityMutation();

    // Voice greeting when the form appears (same message as web)
    useEffect(() => {
        Speech.speak(
            "I don't recognize this face. Please ask the visitor to tell their name and relation, or type it manually on the screen.",
            { rate: 0.9 }
        );
        return () => {
            Speech.stop();
        };
    }, []);

    const handleSubmit = async () => {
        if (!name.trim() || !relation.trim()) return;
        try {
            await suggestIdentity({
                personId: unknownPersonId,
                suggestedName: name.trim(),
                suggestedRelation: relation.trim(),
                patientId,
            }).unwrap();
            setSubmitted(true);
        } catch (err) {
            console.warn("[SuggestIdentity] failed:", err);
        }
    };

    if (submitted) {
        return (
            <View className="flex-1 items-center justify-center gap-3 py-6">
                <View className="h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                    <CheckCircleIcon size={24} color="#059669" strokeWidth={2} />
                </View>
                <Text className="font-semibold text-foreground">Suggestion sent!</Text>
                <Text className="px-8 text-center text-sm text-muted-foreground">
                    Your caregiver will verify and add this person.
                </Text>
                <View className="mt-1 w-full flex-row justify-center gap-2 px-6">
                    <TouchableOpacity
                        onPress={onContinue}
                        className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5"
                    >
                        <ChatBubbleLeftRightIcon size={14} color="#FFFFFF" strokeWidth={2} />
                        <Text className="text-sm font-semibold text-white">Start</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={onRetry}
                        className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5"
                    >
                        <ViewfinderCircleIcon size={14} color="#0C0F1A" strokeWidth={2} />
                        <Text className="text-sm font-semibold text-foreground">Scan again</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 12, gap: 12 }}>
            <View className="items-center gap-2">
                <View className="h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                    <UserIcon size={28} color="#6B7897" strokeWidth={1.75} />
                </View>
                <Text className="text-base font-bold text-foreground">Not recognised</Text>
                <Text className="text-center text-sm text-muted-foreground">
                    Do you know this person? Tell us who they are.
                </Text>
            </View>
            <View className="gap-2">
                <TextInput
                    style={styles.textInput}
                    value={name}
                    onChangeText={setName}
                    placeholder="Their name (e.g. Rahul)"
                    autoCapitalize="words"
                />
                <TextInput
                    style={styles.textInput}
                    value={relation}
                    onChangeText={setRelation}
                    placeholder="Relation (e.g. son, doctor)"
                    autoCapitalize="words"
                />
            </View>
            <View className="gap-2">
                <View className="flex-row gap-2">
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={isLoading || !name.trim() || !relation.trim()}
                        className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-foreground py-2.5 disabled:opacity-40"
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <PaperAirplaneIcon size={14} color="#FFFFFF" strokeWidth={2} />
                        )}
                        <Text className="text-sm font-semibold text-white">Send for verification</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={onRetry}
                        className="items-center justify-center rounded-xl border border-border px-3"
                    >
                        <ArrowPathIcon size={16} color="#0C0F1A" strokeWidth={2} />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    onPress={onContinue}
                    className="w-full flex-row items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 py-2.5"
                >
                    <ChatBubbleLeftRightIcon size={14} color="#6B7897" strokeWidth={2} />
                    <Text className="text-sm font-semibold text-muted-foreground">
                        Skip & start conversation
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

// ─── Recognition result card ──────────────────────────────────────────────────
function RecognitionCard({
    result,
    patientId,
    onRetry,
    onContinue,
}: {
    result: { success: boolean; data?: MatchFaceData };
    patientId: number;
    onRetry: () => void;
    onContinue: () => void;
}) {
    const d = result.data;
    const noFace = !d || ("error" in d && d.error === "no_face_detected");
    const isRec = d && "recognised" in d && d.recognised;

    if (noFace) {
        return (
            <View className="flex-1 items-center justify-center gap-4 py-8">
                <View className="h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
                    <ExclamationTriangleIcon size={32} color="#F59E0B" strokeWidth={1.75} />
                </View>
                <View>
                    <Text className="text-lg font-bold text-foreground">No face detected</Text>
                    <Text className="mt-1 text-center text-sm text-muted-foreground">
                        Ensure good lighting and face clearly visible.
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={onRetry}
                    className="flex-row items-center gap-2 rounded-xl bg-foreground px-5 py-2.5"
                >
                    <ArrowPathIcon size={16} color="#FFFFFF" strokeWidth={2} />
                    <Text className="text-sm font-semibold text-white">Try again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (isRec && "name" in d) {
        return (
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16 }}>
                <View className="items-center gap-4">
                    <View className="relative">
                        {d.image_url ? (
                            <Image
                                source={{ uri: imageUrl(d.image_url)! }}
                                className="h-20 w-20 rounded-2xl"
                                style={{ resizeMode: "cover" }}
                            />
                        ) : (
                            <View className="h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10">
                                <CheckBadgeIcon size={40} color="#059669" strokeWidth={1.5} />
                            </View>
                        )}
                        <View className="absolute -bottom-1 -right-1 h-7 w-7 items-center justify-center rounded-full bg-emerald-500">
                            <CheckCircleIcon size={16} color="#FFFFFF" strokeWidth={2.5} />
                        </View>
                    </View>
                    <View className="items-center">
                        <Text className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-600">
                            Recognised
                        </Text>
                        <Text className="text-3xl font-bold text-foreground">{d.name}</Text>
                        <View
                            className="mt-1.5 rounded-full px-3 py-0.5"
                            style={{ backgroundColor: RELATION_COLORS[(d.relation ?? "").toLowerCase()] ?? "#F1F5F9" }}
                        >
                            <Text className="text-xs font-semibold capitalize text-foreground">{d.relation}</Text>
                        </View>
                    </View>
                    <View className="w-full max-w-[220px]">
                        <View className="mb-1.5 flex-row justify-between">
                            <Text className="text-xs text-muted-foreground">Confidence</Text>
                            <Text className="text-xs font-bold text-foreground">
                                {Math.round(d.similarity * 100)}%
                            </Text>
                        </View>
                        <View className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <View
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${Math.round(d.similarity * 100)}%` }}
                            />
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={onRetry}
                        className="flex-row items-center gap-2 rounded-xl border border-border px-5 py-2"
                    >
                        <ViewfinderCircleIcon size={16} color="#0C0F1A" strokeWidth={2} />
                        <Text className="text-sm font-semibold text-foreground">Scan again</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    }

    // Unknown face — show suggestion form
    const unknownPersonId = d && "unknown_face_id" in d ? d.unknown_face_id : null;
    if (unknownPersonId) {
        return (
            <SuggestIdentityForm
                unknownPersonId={unknownPersonId}
                patientId={patientId}
                onRetry={onRetry}
                onContinue={onContinue}
            />
        );
    }

    return (
        <View className="flex-1 items-center justify-center gap-4 py-8">
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <UserIcon size={32} color="#6B7897" strokeWidth={1.75} />
            </View>
            <View>
                <Text className="text-lg font-bold text-foreground">Not recognised</Text>
                <Text className="mt-1 text-center text-sm text-muted-foreground">
                    This face hasn’t been registered.
                </Text>
            </View>
            <TouchableOpacity
                onPress={onRetry}
                className="flex-row items-center gap-2 rounded-xl border border-border px-5 py-2"
            >
                <ViewfinderCircleIcon size={16} color="#0C0F1A" strokeWidth={2} />
                <Text className="text-sm font-semibold text-foreground">Try again</Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── Visitor Notification Card ────────────────────────────────────────────────
function VisitorNotificationCard({
    name,
    relation,
    imageUrlProp,
    onDismiss,
}: {
    name: string;
    relation: string;
    imageUrlProp?: string;
    onDismiss: () => void;
}) {
    return (
        <View className="absolute inset-0 z-50 items-center justify-center bg-black/50 p-4">
            <View
                className="w-full max-w-sm overflow-hidden rounded-3xl border-2 bg-white"
                style={{ borderColor: "#10B98166" }}
            >
                <View
                    className="items-center gap-4 px-6 pb-6 pt-8"
                    style={{ backgroundColor: "#ECFDF5" }}
                >
                    <View className="relative">
                        {imageUrlProp ? (
                            <Image
                                source={{ uri: imageUrl(imageUrlProp)! }}
                                className="h-28 w-28 rounded-full"
                                style={{ resizeMode: "cover" }}
                            />
                        ) : (
                            <View className="h-28 w-28 items-center justify-center rounded-full bg-emerald-500/15">
                                <HeartIcon size={48} color="#059669" strokeWidth={1.5} />
                            </View>
                        )}
                        <View className="absolute -bottom-1 -right-1 h-8 w-8 items-center justify-center rounded-full bg-emerald-500">
                            <BellIcon size={16} color="#FFFFFF" strokeWidth={2} />
                        </View>
                    </View>
                    <View>
                        <Text className="mb-1 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-600">
                            Someone is here to visit you!
                        </Text>
                        <Text className="text-center text-3xl font-bold text-foreground">{name}</Text>
                        <View className="mt-2 rounded-full bg-emerald-500/15 px-4 py-1 self-center">
                            <Text className="text-sm font-semibold capitalize text-emerald-700">{relation}</Text>
                        </View>
                    </View>
                </View>
                <View className="px-6 pb-6 pt-4">
                    <TouchableOpacity
                        onPress={onDismiss}
                        className="w-full rounded-2xl bg-foreground py-3"
                    >
                        <Text className="text-center text-sm font-bold text-white">Great, thank you!</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

// ─── Past conversations panel (shown after recognition) ───────────────────────
function PersonHistoryPanel({
    personId,
    personName,
}: {
    personId: number;
    personName: string;
}) {
    const { data, isLoading } = useGetConversationsForPersonQuery(personId);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [showAll, setShowAll] = useState(false);
    const convs = data?.data?.conversations ?? [];

    if (isLoading) {
        return (
            <View className="flex-row items-center justify-center py-4">
                <ActivityIndicator size="small" color="#6B7897" />
                <Text className="ml-2 text-xs text-muted-foreground">Loading past conversations…</Text>
            </View>
        );
    }

    if (data?.data?.history_restricted) {
        return (
            <View className="rounded-xl border border-dashed border-border px-4 py-3">
                <Text className="text-center text-xs text-muted-foreground">
                    Previous conversation history is restricted. Focusing on today’s visit.
                </Text>
            </View>
        );
    }

    if (convs.length === 0) {
        return (
            <View className="rounded-xl border border-dashed border-border px-4 py-3">
                <Text className="text-center text-xs text-muted-foreground">
                    No previous conversations with {personName}.
                </Text>
            </View>
        );
    }

    // Most recent conversation that has a summary — shown prominently
    const latestWithSummary = convs.find((c) => c.summary);
    const olderConvs = showAll ? convs.slice(1) : [];

    return (
        <View className="gap-2">
            {/* ── Latest summary card (always visible) ── */}
            {latestWithSummary && (
                <View className="overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                    <View className="flex-row items-center gap-2 border-b border-emerald-500/20 px-4 py-2.5">
                        <CpuChipIcon size={14} color="#059669" strokeWidth={2} />
                        <Text className="flex-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                            Last visit with {personName}
                        </Text>
                        <Text className="text-[10px] text-muted-foreground">
                            {timeAgo(latestWithSummary.started_at)}
                        </Text>
                    </View>
                    <View className="px-4 py-3">
                        <Text className="text-sm leading-relaxed text-foreground">
                            {latestWithSummary.summary}
                        </Text>
                    </View>
                </View>
            )}

            {/* ── Older conversations (collapsible list) ── */}
            {convs.length > 1 && (
                <>
                    <TouchableOpacity
                        onPress={() => setShowAll((v) => !v)}
                        className="flex-row items-center gap-2 py-1"
                    >
                        <ClockIcon size={14} color="#6B7897" strokeWidth={2} />
                        <Text className="flex-1 text-xs text-muted-foreground">
                            {showAll ? "Hide" : "Show"} {convs.length - 1} older conversation
                            {convs.length - 1 !== 1 ? "s" : ""}
                        </Text>
                        {showAll ? (
                            <ChevronUpIcon size={12} color="#6B7897" strokeWidth={2} />
                        ) : (
                            <ChevronDownIcon size={12} color="#6B7897" strokeWidth={2} />
                        )}
                    </TouchableOpacity>

                    {showAll &&
                        olderConvs.map((conv) => {
                            const isOpen = expandedId === conv.id;
                            return (
                                <View
                                    key={conv.id}
                                    className="overflow-hidden rounded-xl border border-border bg-muted/30"
                                >
                                    <TouchableOpacity
                                        onPress={() => setExpandedId(isOpen ? null : conv.id)}
                                        className="flex-row items-center justify-between px-4 py-3"
                                    >
                                        <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
                                            <ClockIcon size={14} color="#6B7897" strokeWidth={2} />
                                            <Text className="flex-1 text-sm font-medium text-foreground" numberOfLines={1}>
                                                {formatDate(conv.started_at)}
                                            </Text>
                                            {conv.summary && (
                                                <View className="rounded-full bg-foreground/10 px-2 py-0.5">
                                                    <Text className="text-[10px] font-medium text-muted-foreground">
                                                        Summary
                                                    </Text>
                                                </View>
                                            )}
                                            {isOpen ? (
                                                <ChevronUpIcon size={14} color="#6B7897" strokeWidth={2} />
                                            ) : (
                                                <ChevronDownIcon size={14} color="#6B7897" strokeWidth={2} />
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                    {isOpen && (
                                        <View className="gap-3 border-t border-border px-4 pb-4 pt-3">
                                            {conv.summary && (
                                                <View className="rounded-xl border border-border bg-foreground/5 p-3">
                                                    <Text className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                        AI Summary
                                                    </Text>
                                                    <Text className="text-sm leading-relaxed text-foreground">
                                                        {conv.summary}
                                                    </Text>
                                                </View>
                                            )}
                                            {conv.transcripts.length > 0 && (
                                                <View style={{ maxHeight: 128 }} className="gap-1.5">
                                                    <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                        Transcript
                                                    </Text>
                                                    <ScrollView nestedScrollEnabled>
                                                        {conv.transcripts.map((t) => (
                                                            <Text
                                                                key={t.id}
                                                                className="border-l-2 border-border py-0.5 pl-2.5 text-xs leading-relaxed text-muted-foreground"
                                                            >
                                                                {t.text}
                                                            </Text>
                                                        ))}
                                                    </ScrollView>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                </>
            )}
        </View>
    );
}

// ─── Face camera panel ────────────────────────────────────────────────────────
function CameraPanel({
    patientId,
    onRecognised,
    onContinueAsUnknown,
}: {
    patientId: number;
    onRecognised: (
        personId: number | null,
        personName: string,
        isFamily: boolean,
        relation: string,
        imageUrl?: string
    ) => void;
    onContinueAsUnknown: () => void;
}) {
    const cameraRef = useRef<CameraView>(null);
    const [permission, requestPermission] = useCameraPermissions();
    const [result, setResult] = useState<{ success: boolean; data?: MatchFaceData } | null>(null);
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
            const file = { uri: photo.uri, name: "cap.jpg", type: "image/jpeg" } as unknown as File;
            const res = await matchFace({ patientId, file }).unwrap();
            const r = res as { success: boolean; data?: MatchFaceData };
            setResult(r);
            if (r.data && "recognised" in r.data && r.data.recognised) {
                onRecognised(r.data.person_id, r.data.name, r.data.is_family, r.data.relation, r.data.image_url);
            } else {
                onRecognised(null, "", false, "");
            }
        } catch {
            setResult({ success: false, data: { recognised: false } });
            onRecognised(null, "", false, "");
        } finally {
            setScanning(false);
            setCountdown(null);
        }
    }, [patientId, matchFace, onRecognised]);

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
            <View className="flex-1 items-center justify-center gap-3 rounded-2xl bg-black/90 px-6 py-8">
                <ExclamationTriangleIcon size={28} color="#FFFFFF88" strokeWidth={1.5} />
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
        <View className="flex-1">
            {/* Viewport */}
            <View className="min-h-[220px] flex-1 overflow-hidden rounded-2xl bg-black">
                <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />

                {/* Scan frame */}
                {!scanning && countdown === null && !result && (
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
                <View className="absolute left-3 top-3 flex-row items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1">
                    <View className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <Text className="text-[10px] font-semibold text-white">LIVE</Text>
                </View>

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

                {/* Result overlay */}
                {result && (
                    <View className="absolute inset-0 overflow-hidden bg-white">
                        <RecognitionCard
                            result={result}
                            patientId={patientId}
                            onRetry={() => setResult(null)}
                            onContinue={onContinueAsUnknown}
                        />
                    </View>
                )}
            </View>

            {/* Controls */}
            {!result && (
                <View className="gap-2 pt-3">
                    <TouchableOpacity
                        onPress={startCountdown}
                        disabled={scanning || countdown !== null}
                        className="flex-row items-center justify-center gap-2 rounded-xl bg-foreground py-3.5 disabled:opacity-40"
                    >
                        {scanning ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : countdown !== null ? (
                            <Text className="text-sm font-semibold text-white">{countdown}…</Text>
                        ) : (
                            <>
                                <ViewfinderCircleIcon size={16} color="#FFFFFF" strokeWidth={2} />
                                <Text className="text-sm font-semibold text-white">Scan face</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

// ─── Live transcription panel ──────────────────────────────────────────────────
function TranscriptionPanel({
    patientId,
    patientName,
    personId,
    autoStart,
}: {
    patientId: number;
    patientName: string;
    personId: number | null;
    autoStart: boolean;
}) {
    const { isRecording, transcripts, summary, error, startRecording, stopRecording } =
        useTranscription(patientId, patientName, personId, { autoStart });

    return (
        <View className="flex-1">
            {/* Summary */}
            <View
                className="mb-3 overflow-hidden rounded-2xl border bg-white"
                style={{
                    borderColor: isRecording ? "#10B98166" : "#E2E8F0",
                }}
            >
                <View className="flex-row items-center gap-2 border-b border-border px-4 py-3">
                    <CpuChipIcon size={16} color="#6B7897" strokeWidth={2} />
                    <Text className="text-sm font-semibold text-foreground">Live summary</Text>
                    {isRecording && (
                        <View className="ml-auto flex-row items-center gap-1.5">
                            <View className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <Text className="text-[11px] font-semibold text-emerald-600">Processing</Text>
                        </View>
                    )}
                </View>
                <View className="min-h-[72px] p-4">
                    {summary ? (
                        <ScrollView style={{ maxHeight: 120 }}>
                            <Text className="text-sm leading-relaxed text-foreground">{summary}</Text>
                        </ScrollView>
                    ) : (
                        <Text className="text-sm italic text-muted-foreground">
                            {isRecording ? "Listening and summarising…" : "Start recording to get an AI summary."}
                        </Text>
                    )}
                </View>
            </View>

            {/* Transcript scroll area */}
            <View className="flex-1 overflow-hidden rounded-2xl border border-border bg-white">
                <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
                    <View className="flex-row items-center gap-2">
                        <ChatBubbleLeftRightIcon size={16} color="#6B7897" strokeWidth={2} />
                        <Text className="text-sm font-semibold text-foreground">Live transcript</Text>
                    </View>
                    <TouchableOpacity
                        onPress={isRecording ? stopRecording : () => startRecording()}
                        className="flex-row items-center gap-1.5 rounded-xl px-3 py-1.5"
                        style={{ backgroundColor: isRecording ? "#F4355C" : "#0C0F1A" }}
                    >
                        {isRecording ? (
                            <>
                                <StopCircleIcon size={12} color="#FFFFFF" fill="#FFFFFF" />
                                <Text className="text-xs font-bold text-white">Stop</Text>
                            </>
                        ) : (
                            <>
                                <MicrophoneIcon size={12} color="#FFFFFF" fill="#FFFFFF" />
                                <Text className="text-xs font-bold text-white">Start</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView className="flex-1 p-4" contentContainerStyle={{ gap: 8 }}>
                    {transcripts.length === 0 ? (
                        <View className="items-center justify-center gap-2 py-6">
                            <ChatBubbleLeftRightIcon size={32} color="#CBD5E1" strokeWidth={1.5} />
                            <Text className="text-center text-xs text-muted-foreground">
                                {isRecording ? "Listening…" : "Press Start to begin transcription."}
                            </Text>
                        </View>
                    ) : (
                        transcripts.map((line) => (
                            <Text
                                key={line.id}
                                className="border-l-2 py-0.5 pl-3 text-sm leading-relaxed text-foreground"
                                style={{ borderColor: "#0C0F1A20" }}
                            >
                                {line.text}
                            </Text>
                        ))
                    )}
                </ScrollView>

                {error && (
                    <View className="px-4 pb-3">
                        <View className="flex-row items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2">
                            <ExclamationTriangleIcon size={14} color="#DC2626" />
                            <Text className="flex-1 text-xs text-destructive">{error}</Text>
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
}

// ─── Caregiver verification modal (logout guard) ──────────────────────────────
function LogoutGuardModal({ onCancel }: { onCancel: () => void }) {
    const session = useAppSelector(selectPatientSession);
    const router = useRouter();
    const [exitSession] = useExitPatientSessionMutation();
    const [verifyCaregiver, { isLoading }] = useVerifyCaregiverMutation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        if (!session) return;
        setError(null);
        try {
            await verifyCaregiver({
                email,
                password,
                patient_id: session.patientId,
            }).unwrap();
            try {
                await exitSession().unwrap();
            } catch {
                /* cookie-only on web; ignore */
            }
            router.replace("/(tabs)/Patients");
        } catch (err: unknown) {
            setError(extractError(err, "Incorrect credentials. Please try again."));
        }
    };

    return (
        <View className="absolute inset-0 z-[100] items-center justify-center bg-black/60 p-4">
            <View className="w-full max-w-[360px] overflow-hidden rounded-2xl bg-white" style={styles.modalShadow}>
                <View className="items-center px-6 pb-5 pt-7">
                    <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-foreground">
                        <LockClosedIcon size={24} color="#FFFFFF" strokeWidth={2} />
                    </View>
                    <Text className="text-xl font-bold text-foreground">Caregiver verification</Text>
                    <Text className="mt-2 px-4 text-center text-sm leading-relaxed text-muted-foreground">
                        Sign in as the caregiver for{" "}
                        <Text className="font-semibold text-foreground">{session?.patientName}</Text> to exit
                        patient mode.
                    </Text>
                </View>
                <View className="gap-3 px-6 pb-7">
                    {error && (
                        <View className="flex-row items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3">
                            <ExclamationTriangleIcon size={16} color="#DC2626" />
                            <Text className="flex-1 text-sm text-destructive">{error}</Text>
                        </View>
                    )}
                    <TextInput
                        style={styles.textInput}
                        placeholder="Caregiver email"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    <TextInput
                        style={styles.textInput}
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                    <View className="flex-row gap-2 pt-1">
                        <TouchableOpacity
                            onPress={onCancel}
                            disabled={isLoading}
                            className="h-11 flex-1 items-center justify-center rounded-xl border border-border disabled:opacity-50"
                        >
                            <Text className="text-sm font-semibold text-foreground">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleConfirm}
                            disabled={isLoading || !email || !password}
                            className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-foreground disabled:opacity-40"
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text className="text-sm font-semibold text-white">Exit mode</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}

// ─── Patient home screen ──────────────────────────────────────────────────────
export default function PatientMode() {
    const session = useAppSelector(selectPatientSession);
    const [recognisedPersonId, setRecognisedPersonId] = useState<number | null>(null);
    const [recognisedPersonName, setRecognisedPersonName] = useState<string>("");
    const [allowUnknownConversation, setAllowUnknownConversation] = useState(false);
    const [visitorNotification, setVisitorNotification] = useState<{
        name: string;
        relation: string;
        imageUrl?: string;
    } | null>(null);
    const [showExitGuard, setShowExitGuard] = useState(false);
    const [recordLocation] = useRecordLocationMutation();

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    // Initial Voice Greeting (same message as web)
    useEffect(() => {
        if (session) {
            Speech.speak("First, perform face verification to start the conversation.", { rate: 0.9 });
        }
        return () => {
            Speech.stop();
        };
    }, [session]);

    // Real-time location tracking (same endpoint as web)
    useEffect(() => {
        if (!session?.patientId) return;
        let subscription: Location.LocationSubscription | null = null;
        let cancelled = false;

        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted" || cancelled) {
                console.warn("[PatientMode] Location permission denied");
                return;
            }
            subscription = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 0 },
                (position) => {
                    recordLocation({
                        patient_id: session.patientId,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                }
            );
        })();

        return () => {
            cancelled = true;
            subscription?.remove();
        };
    }, [session?.patientId, recordLocation]);

    const handleRecognised = useCallback(
        (pid: number | null, name: string, isFamily: boolean, relation: string, img?: string) => {
            setRecognisedPersonId(pid);
            setRecognisedPersonName(name);
            setAllowUnknownConversation(false);
            if (pid && isFamily && name) {
                setVisitorNotification({ name, relation, imageUrl: img });
            }
        },
        []
    );

    const handleContinueAsUnknown = useCallback(() => {
        setAllowUnknownConversation(true);
    }, []);

    // All hooks above — keep the early return after every hook call.
    if (!session) {
        return (
            <View style={styles.flex} className="items-center justify-center bg-background">
                <ActivityIndicator size="large" color="#208AEF" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            className="bg-background"
        >
            {/* ── Top greeting bar ── */}
            <View className="shrink-0 flex-row items-center gap-3 border-b border-border bg-white px-6 py-4">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-foreground">
                    <CpuChipIcon size={20} color="#FFFFFF" strokeWidth={2} />
                </View>
                <View className="flex-1">
                    <Text className="text-xs font-medium text-muted-foreground">{greeting}</Text>
                    <Text className="text-lg font-bold leading-tight text-foreground">
                        {session.patientName}
                    </Text>
                </View>
                <View className="mr-2 flex-row items-center gap-1.5">
                    <View className="h-2 w-2 rounded-full bg-emerald-500" />
                    <Text className="text-xs font-semibold text-emerald-600">Active</Text>
                </View>
                <TouchableOpacity
                    onPress={() => setShowExitGuard(true)}
                    className="rounded-full bg-muted p-2.5"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <ArrowLeftIcon size={16} color="#6B7897" strokeWidth={2} />
                </TouchableOpacity>
            </View>

            {/* ── Visitor notification overlay ── */}
            {visitorNotification && (
                <VisitorNotificationCard
                    name={visitorNotification.name}
                    relation={visitorNotification.relation || "family"}
                    imageUrlProp={visitorNotification.imageUrl}
                    onDismiss={() => setVisitorNotification(null)}
                />
            )}

            {/* ── Main split layout ── */}
            <ScrollView contentContainerStyle={styles.scrollContent} className="flex-1">
                {/* ── LEFT: Conversation panel ── */}
                <View className="flex-row items-center gap-2">
                    <ChatBubbleLeftRightIcon size={16} color="#6B7897" strokeWidth={2} />
                    <Text className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        Conversation
                    </Text>
                </View>

                {recognisedPersonId || allowUnknownConversation ? (
                    <>
                        {recognisedPersonId && (
                            <PersonHistoryPanel
                                personId={recognisedPersonId}
                                personName={recognisedPersonName}
                            />
                        )}
                        <View style={{ height: 420 }}>
                            <TranscriptionPanel
                                patientId={session.patientId}
                                patientName={session.patientName}
                                personId={recognisedPersonId}
                                autoStart={true}
                            />
                        </View>
                    </>
                ) : (
                    <View className="flex-1 items-center justify-center gap-3 py-10">
                        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                            <ChatBubbleLeftRightIcon size={28} color="#94A3B8" strokeWidth={1.5} />
                        </View>
                        <Text className="font-semibold text-foreground">Awaiting Recognition</Text>
                        <Text className="px-8 text-center text-sm text-muted-foreground">
                            Scan a face below to start recording the conversation.
                        </Text>
                    </View>
                )}

                {/* ── Face recognition camera ── */}
                <View className="flex-row items-center gap-2">
                    <ViewfinderCircleIcon size={16} color="#6B7897" strokeWidth={2} />
                    <Text className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        Face recognition
                    </Text>
                </View>
                <View style={{ height: 380 }}>
                    <CameraPanel
                        patientId={session.patientId}
                        onRecognised={handleRecognised}
                        onContinueAsUnknown={handleContinueAsUnknown}
                    />
                </View>
            </ScrollView>

            {/* ── Logout guard modal ── */}
            {showExitGuard && <LogoutGuardModal onCancel={() => setShowExitGuard(false)} />}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    scrollContent: { padding: 16, gap: 12, paddingBottom: 32 },
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

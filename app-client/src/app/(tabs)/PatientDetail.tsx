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
    Image,
    Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
    ArrowLeftIcon,
    PlusIcon,
    CameraIcon,
    TrashIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    CheckBadgeIcon,
    UserIcon,
    ClockIcon,
    HeartIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    ViewfinderCircleIcon,
    DevicePhoneMobileIcon,
    ShieldCheckIcon,
    ChatBubbleLeftRightIcon,
    CpuChipIcon,
} from "react-native-heroicons/outline";
import { Text } from "@/components/ui/text";
import { Blob } from "@/components/ui/blob";
import {
    useGetPatientQuery,
    useGetPersonsQuery,
    useDeletePersonMutation,
    useUpdatePersonMutation,
} from "@/services/patientApi";
import { useStartPatientSessionMutation } from "@/services/patientSessionApi";
import { useStoreKnownFaceMutation } from "@/services/recognitionApi";
import { useGetConversationsQuery } from "@/services/transcriptionApi";
import { BASE_URL } from "@/services/api";
import type { Person } from "@/types";

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

// ─── Add Known Face Modal ─────────────────────────────────────────────────────
function AddFaceModal({
    patientId,
    onClose,
}: {
    patientId: number;
    onClose: () => void;
}) {
    const [storeKnownFace, { isLoading }] = useStoreKnownFaceMutation();
    const [name, setName] = useState("");
    const [relation, setRelation] = useState("");
    const [image, setImage] = useState<{ uri: string; name: string; type: string } | null>(null);
    const [formError, setFormError] = useState("");

    const pickImage = async () => {
        setFormError("");
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.9,
            allowsEditing: true,
            aspect: [1, 1],
        });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            const ext = asset.uri.split(".").pop()?.toLowerCase() ?? "jpg";
            const mime = ext === "png" ? "image/png" : "image/jpeg";
            setImage({ uri: asset.uri, name: `face.${ext}`, type: mime });
        }
    };

    const onSubmit = async () => {
        if (name.trim().length < 2) {
            setFormError("Name is required");
            return;
        }
        if (!relation.trim()) {
            setFormError("Relation is required");
            return;
        }
        if (!image) {
            setFormError("Please select a photo.");
            return;
        }
        try {
            let fileToUpload: any = image;
            if (Platform.OS === "web" && image.uri) {
                const res = await fetch(image.uri);
                const blob = await res.blob();
                fileToUpload = new File([blob], image.name, { type: image.type });
            }
            await storeKnownFace({
                patientId,
                name: name.trim(),
                relation: relation.trim(),
                file: fileToUpload,
            }).unwrap();
            onClose();
        } catch (err: unknown) {
            setFormError(extractError(err, "Failed to register face. Ensure the photo shows a clear face."));
        }
    };

    return (
        <Modal transparent animationType="fade" onRequestClose={onClose}>
            <View className="flex-1 items-center justify-center bg-black/40 p-4">
                <Pressable className="absolute inset-0" onPress={onClose} />
                <View className="w-full rounded-2xl bg-white" style={styles.modalShadow}>
                    <View className="border-b border-border px-6 py-4">
                        <Text className="text-base font-semibold text-foreground">Register known person</Text>
                        <Text className="mt-0.5 text-sm text-muted-foreground">
                            Upload a clear photo. The face will be encoded and stored.
                        </Text>
                    </View>
                    <View className="gap-4 px-6 py-5">
                        {/* Photo picker */}
                        <TouchableOpacity
                            onPress={pickImage}
                            className="items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-5"
                        >
                            {image ? (
                                <Image
                                    source={{ uri: image.uri }}
                                    className="h-28 w-28 rounded-full"
                                    style={{ resizeMode: "cover" }}
                                />
                            ) : (
                                <>
                                    <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
                                        <CameraIcon size={20} color="#6B7897" strokeWidth={1.75} />
                                    </View>
                                    <Text className="text-sm text-muted-foreground">Tap to upload photo</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <View className="flex-row gap-3">
                            <View className="flex-1">
                                <Text className="mb-1.5 text-sm font-medium text-foreground">
                                    Full name <Text className="text-destructive">*</Text>
                                </Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Rahul Singh"
                                    value={name}
                                    onChangeText={setName}
                                    autoCapitalize="words"
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="mb-1.5 text-sm font-medium text-foreground">
                                    Relation <Text className="text-destructive">*</Text>
                                </Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Son"
                                    value={relation}
                                    onChangeText={setRelation}
                                    autoCapitalize="words"
                                />
                            </View>
                        </View>

                        {!!formError && (
                            <View className="flex-row items-center gap-1">
                                <ExclamationTriangleIcon size={14} color="#DC2626" />
                                <Text className="flex-1 text-xs text-destructive">{formError}</Text>
                            </View>
                        )}

                        <View className="flex-row justify-end gap-2 pt-1">
                            <TouchableOpacity onPress={onClose} className="rounded-xl border border-border px-4 py-2.5">
                                <Text className="text-sm font-semibold text-muted-foreground">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={onSubmit}
                                disabled={isLoading}
                                className="flex-row items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5"
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text className="text-sm font-semibold text-white">Register face</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
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
    const [name, setName] = useState(person.name ?? "");
    const [relation, setRelation] = useState(person.relation ?? "");
    const [error, setError] = useState("");

    const onSubmit = async () => {
        if (name.trim().length < 2) {
            setError("Name is required");
            return;
        }
        if (!relation.trim()) {
            setError("Relation is required");
            return;
        }
        try {
            await updatePerson({
                patientId,
                personId: person.id,
                payload: { name: name.trim(), relation: relation.trim(), is_known: true },
            }).unwrap();
            onClose();
        } catch (err: unknown) {
            setError(extractError(err, "Failed to label person."));
        }
    };

    return (
        <Modal transparent animationType="fade" onRequestClose={onClose}>
            <View className="flex-1 items-center justify-center bg-black/40 p-4">
                <Pressable className="absolute inset-0" onPress={onClose} />
                <View className="w-full rounded-2xl bg-white" style={styles.modalShadow}>
                    <View className="border-b border-border px-6 py-4">
                        <Text className="text-base font-semibold text-foreground">Label unknown person</Text>
                        <Text className="mt-0.5 text-sm text-muted-foreground">
                            Mark this unknown face as a known person.
                        </Text>
                    </View>
                    <View className="gap-3 px-6 py-5">
                        {person.image_url ? (
                            <View className="items-center pb-1">
                                <Image
                                    source={{ uri: imageUrl(person.image_url)! }}
                                    className="h-20 w-20 rounded-full ring-2"
                                    style={{ resizeMode: "cover" }}
                                />
                            </View>
                        ) : (
                            <View className="items-center pb-1">
                                <View className="h-20 w-20 items-center justify-center rounded-full bg-amber-500/10">
                                    <UserIcon size={32} color="#D97706" strokeWidth={1.75} />
                                </View>
                            </View>
                        )}
                        <View>
                            <Text className="mb-1.5 text-sm font-medium text-foreground">
                                Full name <Text className="text-destructive">*</Text>
                            </Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Rahul Singh"
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                            />
                        </View>
                        <View>
                            <Text className="mb-1.5 text-sm font-medium text-foreground">
                                Relation <Text className="text-destructive">*</Text>
                            </Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Son"
                                value={relation}
                                onChangeText={setRelation}
                                autoCapitalize="words"
                            />
                        </View>
                        {error ? <Text className="text-xs text-destructive">{error}</Text> : null}
                        <View className="flex-row justify-end gap-2 pt-1">
                            <TouchableOpacity onPress={onClose} className="rounded-xl border border-border px-4 py-2.5">
                                <Text className="text-sm font-semibold text-muted-foreground">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={onSubmit}
                                disabled={isLoading}
                                className="rounded-xl bg-primary px-4 py-2.5"
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text className="text-sm font-semibold text-white">Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─── Family Email Modal ───────────────────────────────────────────────────────
function FamilyEmailModal({
    person,
    patientId,
    onClose,
}: {
    person: Person;
    patientId: number;
    onClose: () => void;
}) {
    const [updatePerson, { isLoading }] = useUpdatePersonMutation();
    const [email, setEmail] = useState(person.family_member_email ?? "");
    const [error, setError] = useState("");

    const handleSave = async () => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError("Enter a valid email address");
            return;
        }
        try {
            await updatePerson({
                patientId,
                personId: person.id,
                payload: { is_family: true, family_member_email: email },
            }).unwrap();
            onClose();
        } catch (err: unknown) {
            setError(extractError(err, "Failed to save email."));
        }
    };

    return (
        <Modal transparent animationType="fade" onRequestClose={onClose}>
            <View className="flex-1 items-center justify-center bg-black/50 p-4">
                <Pressable className="absolute inset-0" onPress={onClose} />
                <View className="w-full overflow-hidden rounded-2xl bg-white" style={styles.modalShadow}>
                    <View
                        className="flex-row items-center gap-3 border-b border-border px-6 pb-5 pt-6"
                        style={{ backgroundColor: "#FEF2F2" }}
                    >
                        <View className="h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15">
                            <HeartIcon size={16} color="#E11D48" strokeWidth={2} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-sm font-semibold text-foreground">Mark as Family Member</Text>
                            <Text className="text-xs text-muted-foreground">
                                We’ll email them whenever {person.name ?? "this person"} visits.
                            </Text>
                        </View>
                    </View>
                    <View className="gap-4 px-6 py-5">
                        <View>
                            <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Family Member’s Email
                            </Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="rahul@gmail.com"
                                value={email}
                                onChangeText={(t) => { setEmail(t); setError(""); }}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoFocus
                            />
                            {error ? <Text className="mt-1 text-xs text-destructive">{error}</Text> : null}
                        </View>
                        <Text className="text-xs leading-relaxed text-muted-foreground">
                            A notification email will be sent to this address every time{" "}
                            <Text className="font-semibold">{person.name ?? "this person"}</Text> is recognised
                            visiting the patient.
                        </Text>
                        <View className="flex-row gap-2 pt-1">
                            <TouchableOpacity
                                onPress={onClose}
                                className="flex-1 rounded-xl border border-border py-2.5"
                            >
                                <Text className="text-center text-sm font-semibold text-muted-foreground">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={isLoading}
                                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-rose-500 py-2.5"
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <HeartIcon size={14} color="#FFFFFF" strokeWidth={2} />
                                        <Text className="text-sm font-semibold text-white">Save & Notify</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─── Pending Verification Card ────────────────────────────────────────────────
function PendingVerificationCard({
    person,
    patientId,
}: {
    person: Person;
    patientId: number;
}) {
    const [updatePerson, { isLoading: approving }] = useUpdatePersonMutation();
    const [deletePerson, { isLoading: rejecting }] = useDeletePersonMutation();
    const [confirmReject, setConfirmReject] = useState(false);

    const handleApprove = async () => {
        try {
            await updatePerson({
                patientId,
                personId: person.id,
                payload: {
                    name: person.suggested_name!,
                    relation: person.suggested_relation!,
                    is_known: true,
                    pending_verification: false,
                    suggested_name: null,
                    suggested_relation: null,
                },
            }).unwrap();
        } catch (err) {
            console.warn("[PendingVerification] Approve failed:", err);
        }
    };

    const handleReject = async () => {
        if (!confirmReject) {
            setConfirmReject(true);
            return;
        }
        try {
            await deletePerson({ patientId, personId: person.id }).unwrap();
        } catch (err) {
            console.warn("[PendingVerification] Reject failed:", err);
        }
    };

    return (
        <View
            className="flex-row items-center gap-3 rounded-xl border px-4 py-3"
            style={{ borderColor: "#FBBF2466", backgroundColor: "#FFFBEB80" }}
        >
            {person.image_url ? (
                <Image
                    source={{ uri: imageUrl(person.image_url)! }}
                    className="h-9 w-9 shrink-0 rounded-full"
                    style={{ resizeMode: "cover" }}
                />
            ) : (
                <View className="h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                    <ClockIcon size={16} color="#D97706" strokeWidth={2} />
                </View>
            )}
            <View className="min-w-0 flex-1">
                <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                    {person.suggested_name}
                    <Text className="text-xs font-normal capitalize text-muted-foreground">
                        {" "}({person.suggested_relation})
                    </Text>
                </Text>
                <Text className="text-xs text-muted-foreground">
                    Suggested by patient · awaiting your verification
                </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
                <TouchableOpacity
                    onPress={handleApprove}
                    disabled={approving || rejecting}
                    className="flex-row items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 disabled:opacity-40"
                >
                    {approving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <ShieldCheckIcon size={14} color="#FFFFFF" strokeWidth={2} />
                    )}
                    <Text className="text-xs font-semibold text-white">Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={handleReject}
                    disabled={approving || rejecting}
                    className="rounded-lg px-2.5 py-1.5"
                    style={{
                        backgroundColor: confirmReject ? "#DC2626" : "transparent",
                        borderWidth: 1,
                        borderColor: confirmReject ? "#DC2626" : "#E2E8F0",
                    }}
                >
                    {rejecting ? (
                        <ActivityIndicator size="small" color="#6B7897" />
                    ) : (
                        <Text
                            className="text-xs font-semibold"
                            style={{ color: confirmReject ? "#FFFFFF" : "#6B7897" }}
                        >
                            {confirmReject ? "Confirm" : "Reject"}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
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
    const [updatePerson, { isLoading: removing }] = useUpdatePersonMutation();
    const [showLabel, setShowLabel] = useState(false);
    const [showFamilyModal, setShowFamilyModal] = useState(false);
    const [confirmDel, setConfirmDel] = useState(false);

    const handleDelete = async () => {
        if (!confirmDel) {
            setConfirmDel(true);
            return;
        }
        try {
            await deletePerson({ patientId, personId: person.id }).unwrap();
        } catch (err) {
            console.warn("[PersonRow] Delete failed:", err);
        }
    };

    const handleRemoveFamily = async () => {
        try {
            await updatePerson({
                patientId,
                personId: person.id,
                payload: { is_family: false, family_member_email: null },
            }).unwrap();
        } catch (err) {
            console.warn("[PersonRow] Remove family failed:", err);
        }
    };

    return (
        <>
            <View className="flex-row items-center justify-between rounded-xl border border-border bg-white px-4 py-3">
                <View className="min-w-0 flex-1 flex-row items-center gap-3">
                    {person.image_url ? (
                        <Image
                            source={{ uri: imageUrl(person.image_url)! }}
                            className="h-9 w-9 shrink-0 rounded-full"
                            style={{ resizeMode: "cover" }}
                        />
                    ) : (
                        <View
                            className="h-9 w-9 shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: person.is_known ? "#0C0F1A14" : "#F59E0B18" }}
                        >
                            {person.is_known ? (
                                <CheckBadgeIcon size={16} color="#0C0F1A" strokeWidth={2} />
                            ) : (
                                <UserIcon size={16} color="#D97706" strokeWidth={2} />
                            )}
                        </View>
                    )}
                    <View className="min-w-0 flex-1">
                        <View className="flex-row flex-wrap items-center gap-1.5">
                            {person.is_known ? (
                                <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                                    {person.name ?? "—"}
                                </Text>
                            ) : (
                                <Text className="text-sm font-medium italic text-amber-600">Unknown person</Text>
                            )}
                            {person.is_family && (
                                <View className="flex-row items-center gap-0.5 rounded-full bg-rose-500/10 px-1.5 py-0.5">
                                    <HeartIcon size={9} color="#E11D48" strokeWidth={2.5} />
                                    <Text className="text-[10px] font-semibold text-rose-600">Family</Text>
                                </View>
                            )}
                        </View>
                        <View className="flex-row flex-wrap items-center gap-2">
                            {!!person.relation && (
                                <Text className="text-xs capitalize text-muted-foreground">{person.relation}</Text>
                            )}
                            {person.is_family && !!person.family_member_email && (
                                <Text className="max-w-[170px] text-xs text-muted-foreground/70" numberOfLines={1}>
                                    ✉ {person.family_member_email}
                                </Text>
                            )}
                        </View>
                    </View>
                </View>

                <View className="ml-2 flex-row items-center gap-1.5">
                    {person.is_known && !person.is_family && (
                        <TouchableOpacity
                            onPress={() => setShowFamilyModal(true)}
                            className="flex-row items-center gap-1 rounded-lg px-2 py-1"
                            style={{ backgroundColor: "#F1F5F9" }}
                        >
                            <HeartIcon size={13} color="#6B7897" strokeWidth={2} />
                            <Text className="text-xs font-medium text-muted-foreground">Family</Text>
                        </TouchableOpacity>
                    )}
                    {person.is_known && person.is_family && (
                        <TouchableOpacity
                            onPress={handleRemoveFamily}
                            disabled={removing}
                            className="rounded-lg bg-rose-500/10 px-2 py-1"
                        >
                            {removing ? (
                                <ActivityIndicator size="small" color="#E11D48" />
                            ) : (
                                <Text className="text-xs font-semibold text-rose-600">Remove</Text>
                            )}
                        </TouchableOpacity>
                    )}
                    {!person.is_known && (
                        <TouchableOpacity
                            onPress={() => setShowLabel(true)}
                            className="rounded-lg bg-amber-500/10 px-2 py-1"
                        >
                            <Text className="text-xs font-semibold text-amber-600">Label</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        onPress={handleDelete}
                        disabled={deleting}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        className={confirmDel ? "rounded-lg bg-destructive/10 p-1.5" : "p-1.5"}
                    >
                        {deleting ? (
                            <ActivityIndicator size="small" color="#6B7897" />
                        ) : (
                            <TrashIcon size={16} color={confirmDel ? "#DC2626" : "#6B7897"} strokeWidth={1.75} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {showFamilyModal && (
                <FamilyEmailModal
                    person={person}
                    patientId={patientId}
                    onClose={() => setShowFamilyModal(false)}
                />
            )}
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

// ─── Conversations Section (caregiver view) ───────────────────────────────────
function toUtc(iso: string) {
    return iso.endsWith("Z") ? iso : iso + "Z";
}
function formatDate(iso: string) {
    const d = new Date(toUtc(iso));
    return `${d.getDate()} ${d.toLocaleString("en", { month: "short" })} ${d.getFullYear()}, ${String(
        d.getHours()
    ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function ConversationsSection({ patientId }: { patientId: number }) {
    const { data, isLoading } = useGetConversationsQuery(patientId);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const conversations = data?.data ?? [];

    return (
        <View className="mt-6">
            <View className="mb-3 flex-row items-center gap-2">
                <ClockIcon size={16} color="#6B7897" strokeWidth={2} />
                <Text className="text-sm font-semibold text-foreground">Conversation History</Text>
                <Text className="text-xs text-muted-foreground">({conversations.length})</Text>
            </View>
            {isLoading ? (
                <View className="justify-center py-6">
                    <ActivityIndicator size="small" color="#6B7897" />
                </View>
            ) : conversations.length === 0 ? (
                <View className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
                    <ChatBubbleLeftRightIcon size={24} color="#94A3B8" strokeWidth={1.5} />
                    <Text className="mt-2 text-center text-sm text-muted-foreground">
                        No conversations recorded yet.
                    </Text>
                </View>
            ) : (
                <View className="gap-2">
                    {conversations.map((conv) => {
                        const isOpen = expandedId === conv.id;
                        const person = conv.person;
                        const initials = person?.name
                            ? person.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
                            : null;
                        return (
                            <View key={conv.id} className="overflow-hidden rounded-xl border border-border bg-white">
                                <TouchableOpacity
                                    onPress={() => setExpandedId(isOpen ? null : conv.id)}
                                    className="flex-row items-center justify-between px-4 py-3"
                                >
                                    <View className="min-w-0 flex-1 flex-row items-center gap-3">
                                        {initials ? (
                                            <View className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/10">
                                                <Text className="text-xs font-bold text-foreground">{initials}</Text>
                                            </View>
                                        ) : (
                                            <View className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                                                <UserIcon size={14} color="#6B7897" strokeWidth={2} />
                                            </View>
                                        )}
                                        <View className="min-w-0 flex-1">
                                            <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                                                {person?.name ?? "Unknown person"}
                                            </Text>
                                            <Text className="text-xs text-muted-foreground">
                                                {formatDate(conv.started_at)} · {conv.transcripts.length} lines
                                            </Text>
                                        </View>
                                    </View>
                                    <View className="ml-2 flex-row items-center gap-2">
                                        {conv.summary && (
                                            <View className="rounded-full bg-emerald-500/10 px-2 py-0.5">
                                                <Text className="text-[10px] font-medium text-emerald-700">Summary</Text>
                                            </View>
                                        )}
                                        {isOpen ? (
                                            <ChevronUpIcon size={16} color="#6B7897" strokeWidth={2} />
                                        ) : (
                                            <ChevronDownIcon size={16} color="#6B7897" strokeWidth={2} />
                                        )}
                                    </View>
                                </TouchableOpacity>
                                {isOpen && (
                                    <View className="gap-3 border-t border-border px-4 pb-4 pt-3">
                                        {conv.summary && (
                                            <View className="rounded-lg border border-border bg-foreground/5 p-3">
                                                <View className="mb-1.5 flex-row items-center gap-1">
                                                    <CpuChipIcon size={12} color="#6B7897" strokeWidth={2} />
                                                    <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                        AI Summary
                                                    </Text>
                                                </View>
                                                <Text className="text-sm leading-relaxed text-foreground">{conv.summary}</Text>
                                            </View>
                                        )}
                                        {conv.transcripts.length > 0 && (
                                            <View style={{ maxHeight: 160 }} className="gap-1">
                                                <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                    Transcript
                                                </Text>
                                                <ScrollView nestedScrollEnabled>
                                                    {conv.transcripts.map((t) => (
                                                        <Text
                                                            key={t.id}
                                                            className="border-l-2 border-border py-0.5 pl-2 text-xs text-muted-foreground"
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
                </View>
            )}
        </View>
    );
}

// ─── Patient Detail Screen ────────────────────────────────────────────────────
export default function PatientDetail() {
    const router = useRouter();
    const params = useLocalSearchParams<{ patientId?: string }>();
    const patientId = Number(params.patientId);

    const { data: patientData, isLoading: loadingPatient } = useGetPatientQuery(patientId);
    const { data: personsData, isLoading: loadingPersons } = useGetPersonsQuery(patientId);
    const [showAddFace, setShowAddFace] = useState(false);
    const [sessionError, setSessionError] = useState<string | null>(null);
    const [startPatientSession, { isLoading: startingSession }] = useStartPatientSessionMutation();

    const handleSwitchToPatient = async () => {
        setSessionError(null);
        try {
            await startPatientSession(patientId).unwrap();
            router.replace("/(patient-mode)/PatientMode");
        } catch (err: unknown) {
            setSessionError(extractError(err, "Failed to start patient session. Please try again."));
        }
    };

    const patient = patientData?.data;
    const persons = personsData?.data ?? [];
    const pending = persons.filter((p) => p.pending_verification);
    const known = persons.filter((p) => p.is_known && !p.pending_verification);
    const unknown = persons.filter((p) => !p.is_known && !p.pending_verification);

    if (loadingPatient) {
        return (
            <View style={styles.flex} className="items-center justify-center bg-background">
                <ActivityIndicator size="large" color="#208AEF" />
            </View>
        );
    }

    if (!patient) {
        return (
            <View style={styles.flex} className="items-center justify-center gap-3 bg-background px-6">
                <ExclamationTriangleIcon size={32} color="#6B7897" strokeWidth={1.5} />
                <Text className="text-muted-foreground">Patient not found.</Text>
                <TouchableOpacity onPress={() => router.back()} className="rounded-xl border border-border px-4 py-2">
                    <Text className="text-sm font-semibold text-foreground">Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.flex} className="bg-background">
            <Blob color="#208AEF" size={220} style={{ top: -70, right: -70 }} opacity={0.07} />

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View className="flex-row items-center gap-3 px-6 pb-4 pt-16">
                    <TouchableOpacity onPress={() => router.back()} className="rounded-full bg-muted p-2">
                        <ArrowLeftIcon size={18} color="#6B7897" strokeWidth={2} />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-2xl font-bold text-foreground">{patient.name}</Text>
                        <View className="flex-row items-center gap-2">
                            {patient.age != null && (
                                <Text className="text-sm text-muted-foreground">{patient.age} years old</Text>
                            )}
                            {!!patient.diagnosis_level && (
                                <Text className="text-sm font-medium capitalize text-foreground">
                                    {patient.diagnosis_level} dementia
                                </Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* Session error banner */}
                {!!sessionError && (
                    <View className="mx-6 mb-4 flex-row items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
                        <ExclamationTriangleIcon size={16} color="#DC2626" />
                        <Text className="flex-1 text-sm text-destructive">{sessionError}</Text>
                    </View>
                )}

                {/* Action buttons */}
                <View className="mx-6 mb-4 gap-2">
                    <TouchableOpacity
                        onPress={handleSwitchToPatient}
                        disabled={startingSession}
                        className="flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3.5"
                    >
                        {startingSession ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <DevicePhoneMobileIcon size={18} color="#FFFFFF" strokeWidth={1.75} />
                        )}
                        <Text className="text-sm font-semibold text-white">
                            {startingSession ? "Starting…" : "Switch to patient mode"}
                        </Text>
                    </TouchableOpacity>
                    <View className="flex-row gap-2">
                        <TouchableOpacity
                            onPress={() => router.push(`/(tabs)/Recognition?patientId=${patientId}`)}
                            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-border bg-white py-3"
                        >
                            <ViewfinderCircleIcon size={16} color="#0C0F1A" strokeWidth={1.75} />
                            <Text className="text-sm font-semibold text-foreground">Run recognition</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setShowAddFace(true)}
                            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-border bg-white py-3"
                        >
                            <PlusIcon size={16} color="#0C0F1A" strokeWidth={2} />
                            <Text className="text-sm font-semibold text-foreground">Add face</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Stats */}
                <View className="mb-5 flex-row gap-2 px-6">
                    <View className="flex-1 rounded-xl border border-border bg-white px-3 py-2.5">
                        <Text className="text-xl font-semibold text-foreground">{persons.length}</Text>
                        <Text className="mt-0.5 text-xs text-muted-foreground">Total persons</Text>
                    </View>
                    <View className="flex-1 rounded-xl border border-border bg-white px-3 py-2.5">
                        <Text className="text-xl font-semibold text-emerald-600">{known.length}</Text>
                        <Text className="mt-0.5 text-xs text-muted-foreground">Known faces</Text>
                    </View>
                    <View className="flex-1 rounded-xl border border-border bg-white px-3 py-2.5">
                        <Text className="text-xl font-semibold text-amber-600">{unknown.length}</Text>
                        <Text className="mt-0.5 text-xs text-muted-foreground">Unknown faces</Text>
                    </View>
                </View>

                {loadingPersons ? (
                    <View className="justify-center py-10">
                        <ActivityIndicator size="small" color="#6B7897" />
                    </View>
                ) : (
                    <View className="gap-5 px-6">
                        {/* Pending verifications */}
                        {pending.length > 0 && (
                            <View>
                                <View className="mb-2 flex-row items-center gap-1.5">
                                    <ClockIcon size={16} color="#F59E0B" strokeWidth={2} />
                                    <Text className="text-sm font-semibold text-foreground">
                                        Pending verification ({pending.length})
                                    </Text>
                                </View>
                                <View className="gap-2">
                                    {pending.map((p) => (
                                        <PendingVerificationCard key={p.id} person={p} patientId={patientId} />
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Known persons */}
                        <View>
                            <View className="mb-2 flex-row items-center gap-1.5">
                                <CheckBadgeIcon size={16} color="#059669" strokeWidth={2} />
                                <Text className="text-sm font-semibold text-foreground">
                                    Known persons ({known.length})
                                </Text>
                            </View>
                            {known.length === 0 ? (
                                <View className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
                                    <Text className="text-center text-sm text-muted-foreground">
                                        No known persons registered yet.
                                    </Text>
                                    <TouchableOpacity onPress={() => setShowAddFace(true)} className="mt-2">
                                        <Text className="text-center text-sm font-medium text-primary underline">
                                            Add a face
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View className="gap-2">
                                    {known.map((p) => (
                                        <PersonRow key={p.id} person={p} patientId={patientId} />
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Unknown faces */}
                        {unknown.length > 0 && (
                            <View>
                                <View className="mb-2 flex-row items-center gap-1.5">
                                    <UserIcon size={16} color="#D97706" strokeWidth={2} />
                                    <Text className="text-sm font-semibold text-foreground">
                                        Unknown faces ({unknown.length})
                                    </Text>
                                </View>
                                <View className="gap-2">
                                    {unknown.map((p) => (
                                        <PersonRow key={p.id} person={p} patientId={patientId} />
                                    ))}
                                </View>
                            </View>
                        )}

                        {persons.length === 0 && (
                            <View className="items-center gap-3 rounded-2xl border border-dashed border-border py-12">
                                <CheckCircleIcon size={32} color="#6B7897" strokeWidth={1.5} />
                                <Text className="font-medium text-foreground">No faces registered</Text>
                                <Text className="px-8 text-center text-sm text-muted-foreground">
                                    Register known people so the system can recognise them.
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setShowAddFace(true)}
                                    className="flex-row items-center gap-1 rounded-xl bg-primary px-4 py-2.5"
                                >
                                    <PlusIcon size={16} color="#FFFFFF" strokeWidth={2.5} />
                                    <Text className="text-sm font-semibold text-white">Add first face</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Conversations */}
                        <ConversationsSection patientId={patientId} />
                    </View>
                )}

                <View className="h-10" />
            </ScrollView>

            {showAddFace && (
                <AddFaceModal patientId={patientId} onClose={() => setShowAddFace(false)} />
            )}
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

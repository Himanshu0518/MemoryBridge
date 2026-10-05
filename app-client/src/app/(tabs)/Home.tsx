import React from "react";
import {
    View,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeftIcon, EyeIcon, AcademicCapIcon, CameraIcon, UserGroupIcon, MapIcon, MicrophoneIcon, SparklesIcon, ChevronRightIcon } from "react-native-heroicons/outline";
import { Text } from "@/components/ui/text";
import { Blob } from "@/components/ui/blob";
import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/store/selectors";
import { useLogoutMutation } from "@/services/userApi";
import { useGetPatientsQuery } from "@/services/patientApi";

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    color: string;
    onPress: () => void;
}

function FeatureCard({ icon, title, description, color, onPress }: FeatureCardProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            className="flex-1"
            style={styles.featureCard}
        >
            <View
                className="rounded-2xl items-center justify-center mb-3"
                style={[styles.featureIcon, { backgroundColor: color + "18" }]}
            >
                {icon}
            </View>
            <Text className="text-foreground font-semibold text-sm mb-1">{title}</Text>
            <Text className="text-muted-foreground text-xs leading-4">{description}</Text>
        </TouchableOpacity>
    );
}

interface QuickStatProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
}

function QuickStat({ label, value, icon, color }: QuickStatProps) {
    return (
        <View
            className="flex-1 rounded-2xl px-4 py-4"
            style={[styles.statCard, { borderLeftWidth: 3, borderLeftColor: color }]}
        >
            <View className="flex-row items-center justify-between mb-2">
                <Text className="text-muted-foreground text-xs uppercase tracking-widest">
                    {label}
                </Text>
                {icon}
            </View>
            <Text className="text-foreground text-2xl font-bold">{value}</Text>
        </View>
    );
}

export default function Home() {
    const router = useRouter();
    const user = useAppSelector(selectUser);
    const [logout] = useLogoutMutation();
    const { data: patientsData } = useGetPatientsQuery();

    const patientCount = patientsData?.data?.length ?? 0;
    const firstName = user?.name?.split(" ")[0] ?? "Caregiver";

    const handleLogout = async () => {
        try {
            await logout().unwrap();
        } catch {
            // Clear anyway on the client side
        }
        router.replace("/(auth)/SignIn");
    };

    const features: FeatureCardProps[] = [
        {
            icon: <CameraIcon size={24} color="#208AEF" strokeWidth={1.75} />,
            title: "Recognition",
            description: "Identify faces in real time",
            color: "#208AEF",
            onPress: () => router.push("/(tabs)/Recognition"),
        },
        {
            icon: <UserGroupIcon size={24} color="#8B5CF6" strokeWidth={1.75} />,
            title: "Patients",
            description: "Manage patient profiles",
            color: "#8B5CF6",
            onPress: () => router.push("/(tabs)/Patients"),
        },
        {
            icon: <MicrophoneIcon size={24} color="#10B981" strokeWidth={1.75} />,
            title: "Transcribe",
            description: "Live conversation notes",
            color: "#10B981",
            onPress: () => { },
        },
        {
            icon: <MapIcon size={24} color="#F59E0B" strokeWidth={1.75} />,
            title: "Tracking",
            description: "Monitor patient location",
            color: "#F59E0B",
            onPress: () => { },
        },
    ];

    return (
        <View style={styles.flex} className="bg-background">
            {/* Decorative blobs */}
            <Blob color="#208AEF" size={280} style={{ top: -60, right: -80 }} opacity={0.1} />
            <Blob color="#8B5CF6" size={180} style={{ top: 200, left: -70 }} opacity={0.07} />

            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View className="px-6 pt-16 pb-4">
                    <View className="flex-row items-start justify-between">
                        <View className="flex-1">
                            <View className="flex-row items-center gap-2 mb-1">
                                <View
                                    className="items-center justify-center rounded-xl bg-primary"
                                    style={styles.headerLogo}
                                >
                                    <AcademicCapIcon size={16} color="#FFFFFF" strokeWidth={1.75} />
                                </View>
                                <Text className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                                    MemoryBridge
                                </Text>
                            </View>
                            <Text className="text-2xl font-bold text-foreground mt-2">
                                Hello, {firstName} 👋
                            </Text>
                            <Text className="text-muted-foreground text-sm mt-0.5">
                                Here's your caregiver overview
                            </Text>
                        </View>

                        <TouchableOpacity
                            onPress={handleLogout}
                            className="rounded-full bg-muted p-2.5 mt-1"
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <ArrowLeftIcon size={18} color="#6B7897" strokeWidth={1.75} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Stats row */}
                <View className="flex-row gap-3 px-6 mb-6">
                    <QuickStat
                        label="Patients"
                        value={patientCount}
                        color="#208AEF"
                        icon={<UserGroupIcon size={14} color="#208AEF" strokeWidth={2} />}
                    />
                    {/* <QuickStat
                        label="Sessions"
                        value="Active"
                        color="#10B981"
                        icon={<Activity size={14} color="#10B981" strokeWidth={2} />}
                    /> */}
                </View>

                {/* AI Highlight banner */}
                <View
                    className="mx-6 mb-6 rounded-2xl px-5 py-5"
                    style={styles.aiBanner}
                >
                    <View className="flex-row items-center gap-2 mb-2">
                        <SparklesIcon size={16} color="#208AEF" strokeWidth={2} />
                        <Text className="text-primary font-semibold text-sm">
                            AI-Powered Memory Support
                        </Text>
                    </View>
                    <Text className="text-foreground text-sm leading-5 mb-4">
                        Use face recognition to identify visitors and automatically start a transcribed,
                        AI-summarized conversation — so your patient always has context.
                    </Text>
                    <TouchableOpacity
                        className="flex-row items-center gap-1 self-start"
                        onPress={() => router.push("/(tabs)/Recognition")}
                    >
                        <Text className="text-primary font-semibold text-sm">
                            Start Recognition
                        </Text>
                        <ChevronRightIcon size={14} color="#208AEF" strokeWidth={2.5} />
                    </TouchableOpacity>
                </View>

                {/* Features grid */}
                <View className="px-6 mb-6">
                    <Text className="text-foreground font-bold text-lg mb-4">
                        Features
                    </Text>
                    <View className="flex-row gap-3 mb-3">
                        <FeatureCard {...features[0]} />
                        <FeatureCard {...features[1]} />
                    </View>
                    <View className="flex-row gap-3">
                        <FeatureCard {...features[2]} />
                        <FeatureCard {...features[3]} />
                    </View>
                </View>

                {/* Patients quick link */}
                <View className="px-6 mb-6">
                    <Text className="text-foreground font-bold text-lg mb-4">
                        Quick Actions
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.push("/(tabs)/Patients")}
                        activeOpacity={0.8}
                        className="flex-row items-center justify-between rounded-2xl bg-surface px-5 py-4"
                        style={styles.quickAction}
                    >
                        <View className="flex-row items-center gap-4">
                            <View
                                className="rounded-xl items-center justify-center"
                                style={[styles.quickActionIcon, { backgroundColor: "#8B5CF618" }]}
                            >
                                <UserGroupIcon size={20} color="#8B5CF6" strokeWidth={1.75} />
                            </View>
                            <View>
                                <Text className="text-foreground font-semibold text-sm">
                                    View All Patients
                                </Text>
                                <Text className="text-muted-foreground text-xs">
                                    {patientCount > 0
                                        ? `${patientCount} patient${patientCount !== 1 ? "s" : ""} registered`
                                        : "No patients yet — add your first"
                                    }
                                </Text>
                            </View>
                        </View>
                        <ChevronRightIcon size={18} color="#6B7897" strokeWidth={2} />
                    </TouchableOpacity>
                </View>

                {/* Footer note */}
                <Text className="text-center text-muted-foreground text-xs px-8 mb-8 leading-5">
                    All patient data is encrypted and scoped to your account only.
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    scroll: { flexGrow: 1, paddingBottom: 24 },
    headerLogo: { width: 28, height: 28 },
    featureCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 16,
        shadowColor: "#0C0F1A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    featureIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
    },
    statCard: {
        backgroundColor: "#FFFFFF",
        shadowColor: "#0C0F1A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    aiBanner: {
        backgroundColor: "#EBF4FE",
        borderWidth: 1,
        borderColor: "#D6EBFC",
    },
    quickAction: {
        shadowColor: "#0C0F1A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    quickActionIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
    },
});

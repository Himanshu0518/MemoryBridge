import React from "react";
import { View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeftIcon, CameraIcon } from "react-native-heroicons/outline";
import { Text } from "@/components/ui/text";

export default function Recognition() {
    const router = useRouter();
    return (
        <View className="flex-1 bg-background">
            <View className="px-6 pt-16 pb-4 flex-row items-center gap-3">
                <TouchableOpacity onPress={() => router.back()} className="rounded-full bg-muted p-2">
                    <ArrowLeftIcon size={18} color="#6B7897" />
                </TouchableOpacity>
                <Text className="text-2xl font-bold text-foreground">Recognition</Text>
            </View>
            <View className="flex-1 items-center justify-center gap-4">
                <View className="rounded-2xl bg-secondary items-center justify-center" style={{ width: 80, height: 80 }}>
                    <CameraIcon size={36} color="#208AEF" strokeWidth={1.5} />
                </View>
                <Text className="text-foreground font-semibold text-lg">Face Recognition</Text>
                <Text className="text-muted-foreground text-sm text-center px-10">
                    AI face recognition module coming soon
                </Text>
            </View>
        </View>
    );
}

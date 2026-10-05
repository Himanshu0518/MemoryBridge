import React, { useState } from "react";
import {
    View,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { EyeIcon, AcademicCapIcon } from "react-native-heroicons/outline";
import { useLoginMutation } from "@/services/userApi";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Blob } from "@/components/ui/blob";

function extractError(error: unknown): string {
    if (
        error &&
        typeof error === "object" &&
        "data" in error &&
        error.data !== null &&
        typeof error.data === "object" &&
        "message" in error.data
    ) {
        return String((error.data as Record<string, unknown>).message);
    }
    return "Something went wrong. Please try again.";
}

export default function SignIn() {
    const router = useRouter();
    const [login, { isLoading }] = useLoginMutation();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
    const [serverError, setServerError] = useState<string | null>(null);

    const validate = (): boolean => {
        const next: typeof errors = {};
        if (!email.trim()) next.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email";
        if (!password) next.password = "Password is required";
        else if (password.length < 6) next.password = "Password must be at least 6 characters";
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleLogin = async () => {
        if (!validate()) return;
        setServerError(null);
        try {
            await login({ email: email.trim().toLowerCase(), password }).unwrap();
            router.replace("/(tabs)/Home");
        } catch (err) {
            setServerError(extractError(err));
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <View style={styles.flex} className="bg-background">
                {/* Decorative blobs */}
                <Blob color="#208AEF" size={320} style={{ top: -80, right: -100 }} opacity={0.12} />
                <Blob color="#5BACF4" size={200} style={{ top: 180, left: -80 }} opacity={0.1} />
                <Blob color="#208AEF" size={260} style={{ bottom: -60, right: -60 }} opacity={0.08} />

                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Logo / Brand */}
                    <View className="items-center mb-10 mt-16">
                        <View
                            className="items-center justify-center rounded-2xl bg-primary mb-4"
                            style={styles.logoBox}
                        >
                            <AcademicCapIcon color="#FFFFFF" size={32} strokeWidth={1.75} />
                        </View>
                        <Text className="text-3xl font-bold text-foreground tracking-tight">
                            MemoryBridge
                        </Text>
                        <Text className="text-muted-foreground text-base mt-1 text-center px-8">
                            AI-assisted memory support for Alzheimer's care
                        </Text>
                    </View>

                    {/* Card */}
                    <View
                        className="bg-surface mx-4 rounded-3xl px-6 pt-8 pb-8"
                        style={styles.card}
                    >
                        <Text className="text-2xl font-bold text-foreground mb-1">
                            Welcome back
                        </Text>
                        <Text className="text-muted-foreground text-sm mb-7">
                            Sign in to continue to your dashboard
                        </Text>

                        {serverError && (
                            <View className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 mb-5">
                                <Text className="text-destructive text-sm">{serverError}</Text>
                            </View>
                        )}

                        <View className="gap-4">
                            <Input
                                label="Email address"
                                placeholder="you@example.com"
                                value={email}
                                onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: undefined })); }}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                                error={errors.email}

                            />

                            <Input
                                label="Password"
                                placeholder="Enter your password"
                                value={password}
                                onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: undefined })); }}
                                secureTextEntry={!showPassword}
                                autoComplete="password"
                                error={errors.password}

                                rightElement={
                                    <TouchableOpacity
                                        onPress={() => setShowPassword((v) => !v)}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        {showPassword
                                            ? <EyeIcon size={18} color="#6B7897" />
                                            : <EyeIcon size={18} color="#6B7897" />
                                        }
                                    </TouchableOpacity>
                                }
                            />
                        </View>

                        {/* Forgot password */}
                        <TouchableOpacity className="self-end mt-3 mb-6">
                            <Text className="text-primary text-sm font-medium">
                                Forgot password?
                            </Text>
                        </TouchableOpacity>

                        {/* Sign in button */}
                        <Button
                            onPress={handleLogin}
                            disabled={isLoading}
                            className="rounded-xl py-4 bg-primary active:opacity-80"
                            style={styles.submitBtn}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text className="text-primary-foreground font-semibold text-base text-center">
                                    Sign In
                                </Text>
                            )}
                        </Button>

                        {/* Divider */}
                        <View className="flex-row items-center my-6 gap-3">
                            <View className="flex-1 h-px bg-border" />
                            <Text className="text-muted-foreground text-xs uppercase tracking-widest">
                                or
                            </Text>
                            <View className="flex-1 h-px bg-border" />
                        </View>

                        {/* Footer */}
                        <View className="flex-row justify-center gap-1.5">
                            <Text className="text-muted-foreground text-sm">
                                Don't have an account?
                            </Text>
                            <TouchableOpacity onPress={() => router.push("/(auth)/SignUp")}>
                                <Text className="text-primary font-semibold text-sm">
                                    Sign Up
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Bottom tagline */}
                    <Text className="text-center text-muted-foreground text-xs mt-8 mb-6 px-8">
                        Helping caregivers and patients reconnect through AI
                    </Text>
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    scroll: { flexGrow: 1, paddingBottom: 24 },
    logoBox: { width: 64, height: 64 },
    card: {
        shadowColor: "#208AEF",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 6,
    },
    submitBtn: {
        height: 52,
    },
});

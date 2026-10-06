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
import { EnvelopeIcon, EyeIcon, AcademicCapIcon } from "react-native-heroicons/outline";
import { useSignupMutation } from "@/services/userApi";
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

interface FormState {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
}

interface FormErrors {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
}

export default function SignUp() {
    const router = useRouter();
    const [signup, { isLoading }] = useSignupMutation();

    const [form, setForm] = useState<FormState>({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [serverError, setServerError] = useState<string | null>(null);

    const set = (field: keyof FormState) => (value: string) => {
        setForm((f) => ({ ...f, [field]: value }));
        setErrors((e) => ({ ...e, [field]: undefined }));
    };

    const validate = (): boolean => {
        const next: FormErrors = {};
        if (!form.name.trim()) next.name = "Full name is required";
        if (!form.email.trim()) next.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Enter a valid email";
        if (!form.password) next.password = "Password is required";
        else if (form.password.length < 8) next.password = "Password must be at least 8 characters";
        if (!form.confirmPassword) next.confirmPassword = "Please confirm your password";
        else if (form.password !== form.confirmPassword) next.confirmPassword = "Passwords do not match";
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSignup = async () => {
        if (!validate()) return;
        setServerError(null);
        try {
            await signup({
                name: form.name.trim(),
                email: form.email.trim().toLowerCase(),
                password: form.password,
                confirm_password: form.confirmPassword,
            }).unwrap();
            router.replace("/(auth)/SignIn");
        } catch (err) {
            setServerError(extractError(err));
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <View style={styles.flex} className="bg-background">
                {/* Decorative blobs */}
                <Blob color="#208AEF" size={280} style={{ top: -70, left: -90 }} opacity={0.12} />
                <Blob color="#5BACF4" size={220} style={{ top: 220, right: -80 }} opacity={0.1} />
                <Blob color="#208AEF" size={200} style={{ bottom: -40, left: -60 }} opacity={0.07} />

                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Brand */}
                    <View className="items-center mb-8 mt-14">
                        <View
                            className="items-center justify-center rounded-2xl bg-primary mb-4"
                            style={styles.logoBox}
                        >
                            <AcademicCapIcon color="#FFFFFF" size={32} strokeWidth={1.75} />
                        </View>
                        <Text className="text-3xl font-bold text-foreground tracking-tight">
                            Join MemoryBridge
                        </Text>
                        <Text className="text-muted-foreground text-sm mt-1 text-center px-8">
                            Create your caregiver account to get started
                        </Text>
                    </View>

                    {/* Card */}
                    <View
                        className="bg-surface mx-4 rounded-3xl px-6 pt-8 pb-8"
                        style={styles.card}
                    >
                        {serverError && (
                            <View className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 mb-5">
                                <Text className="text-destructive text-sm">{serverError}</Text>
                            </View>
                        )}

                        <View className="gap-4">
                            <Input
                                label="Full name"
                                placeholder="Jane Smith"
                                value={form.name}
                                onChangeText={set("name")}
                                autoCapitalize="words"
                                autoComplete="name"
                                error={errors.name}
                            />

                            <Input
                                label="Email address"
                                placeholder="you@example.com"
                                value={form.email}
                                onChangeText={set("email")}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                                error={errors.email}
                                leftIcon={<EnvelopeIcon size={18} color="#6B7897" />}
                            />

                            <Input
                                label="Password"
                                placeholder="At least 8 characters"
                                value={form.password}
                                onChangeText={set("password")}
                                secureTextEntry={!showPassword}
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

                            <Input
                                label="Confirm password"
                                placeholder="Re-enter your password"
                                value={form.confirmPassword}
                                onChangeText={set("confirmPassword")}
                                secureTextEntry={!showConfirm}
                                error={errors.confirmPassword}
                                rightElement={
                                    <TouchableOpacity
                                        onPress={() => setShowConfirm((v) => !v)}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        {showConfirm
                                            ? <EyeIcon size={18} color="#6B7897" />
                                            : <EyeIcon size={18} color="#6B7897" />
                                        }
                                    </TouchableOpacity>
                                }
                            />
                        </View>

                        {/* Terms note */}
                        <Text className="text-muted-foreground text-xs mt-4 mb-6 leading-5">
                            By creating an account, you agree to our{" "}
                            <Text className="text-primary font-medium">Terms of Service</Text> and{" "}
                            <Text className="text-primary font-medium">Privacy Policy</Text>.
                        </Text>

                        <Button
                            onPress={handleSignup}
                            disabled={isLoading}
                            className="rounded-xl bg-primary active:opacity-80"
                            style={styles.submitBtn}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text className="text-primary-foreground font-semibold text-base text-center">
                                    Create Account
                                </Text>
                            )}
                        </Button>

                        <View className="flex-row items-center my-5 gap-3">
                            <View className="flex-1 h-px bg-border" />
                        </View>

                        <View className="flex-row justify-center gap-1.5">
                            <Text className="text-muted-foreground text-sm">
                                Already have an account?
                            </Text>
                            <TouchableOpacity onPress={() => router.push("/(auth)/SignIn")}>
                                <Text className="text-primary font-semibold text-sm">
                                    Sign In
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View className="h-8" />
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    scroll: { flexGrow: 1 },
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

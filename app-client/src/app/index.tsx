import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import {
  selectIsLoggedIn,
  selectIsInitialized,
  selectIsInPatientMode,
} from "@/store/selectors";

/**
 * Root entry point.
 * Waits for auth rehydration, then routes to home or sign-in.
 * If the device was left in patient mode (survives app restarts, like the web
 * client), route straight into Patient Mode.
 */
export default function Index() {
  const router = useRouter();
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const isInitialized = useAppSelector(selectIsInitialized);
  const isInPatientMode = useAppSelector(selectIsInPatientMode);

  useEffect(() => {
    if (!isInitialized) return;
    if (isInPatientMode) {
      router.replace("/(patient-mode)/PatientMode");
    } else if (isLoggedIn) {
      router.replace("/(tabs)/Home");
    } else {
      router.replace("/(auth)/SignIn");
    }
  }, [isInitialized, isLoggedIn, isInPatientMode, router]);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" color="#208AEF" />
    </View>
  );
}

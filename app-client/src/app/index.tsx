import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { selectIsLoggedIn, selectIsInitialized } from "@/store/selectors";

/**
 * Root entry point.
 * Waits for auth rehydration, then routes to home or sign-in.
 */
export default function Index() {
  const router = useRouter();
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const isInitialized = useAppSelector(selectIsInitialized);

  useEffect(() => {
    if (!isInitialized) return;
    if (isLoggedIn) {
      router.replace("/(tabs)/Home");
    } else {
      router.replace("/(auth)/SignIn");
    }
  }, [isInitialized, isLoggedIn, router]);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" color="#208AEF" />
    </View>
  );
}

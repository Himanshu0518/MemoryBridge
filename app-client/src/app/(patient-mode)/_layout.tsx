import { Stack, Redirect } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { selectIsInPatientMode, selectIsInitialized } from "@/store/selectors";

export default function PatientModeLayout() {
  const isInitialized = useAppSelector(selectIsInitialized);
  const isInPatientMode = useAppSelector(selectIsInPatientMode);

  if (isInitialized && !isInPatientMode) {
    return <Redirect href="/(auth)/SignIn" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_bottom",
        contentStyle: { backgroundColor: "#F8FAFF" },
      }}
    />
  );
}

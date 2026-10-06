import { Stack } from "expo-router";

export default function PatientModeLayout() {
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

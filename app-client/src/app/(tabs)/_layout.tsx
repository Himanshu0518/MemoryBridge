import { Stack } from "expo-router";

export default function TabsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: "#F8FAFF" },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="Home" />
      <Stack.Screen name="Patients" />
      <Stack.Screen name="PatientDetail" />
      <Stack.Screen name="Recognition" />
      <Stack.Screen name="Transcribe" />
      <Stack.Screen name="Tracking" />
    </Stack>
  );
}
import "@/global.css";
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { store } from "@/store";
import { useAppDispatch } from "@/store/hooks";
import { restoreAuth } from "@/store/authSlice";
import { restoreSession } from "@/store/patientSessionSlice";
import {
  getStorageItem,
  setStorageItem,
  STORAGE_KEYS,
} from "@/lib/storage";

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    async function rehydrateState() {
      try {
        const [token, refreshToken, userIdRaw, patientMode, patientSessionRaw] =
          await Promise.all([
            getStorageItem(STORAGE_KEYS.ACCESS_TOKEN),
            getStorageItem(STORAGE_KEYS.REFRESH_TOKEN),
            getStorageItem(STORAGE_KEYS.USER_ID),
            getStorageItem(STORAGE_KEYS.PATIENT_MODE),
            getStorageItem(STORAGE_KEYS.PATIENT_SESSION),
          ]);

        // Patient session token is stored inside the persisted session JSON and
        // re-applied so API calls made in patient mode use the patient token.
        if (patientMode === "true" && patientSessionRaw) {
          try {
            const parsed = JSON.parse(patientSessionRaw) as { token?: string };
            if (parsed.token) {
              await setStorageItem(STORAGE_KEYS.PATIENT_TOKEN, parsed.token);
            }
          } catch {
            // ignore malformed session
          }
        }

        const userId = userIdRaw ? Number(userIdRaw) : null;

        dispatch(
          restoreAuth({
            token,
            refreshToken,
            userId,
          })
        );

        if (patientMode === "true" && patientSessionRaw) {
          try {
            const parsedSession = JSON.parse(patientSessionRaw);
            dispatch(restoreSession(parsedSession));
          } catch {
            dispatch(restoreSession(null));
          }
        } else {
          dispatch(restoreSession(null));
        }
      } catch (error) {
        console.warn("[rehydrateState] Error during auth rehydration:", error);
        dispatch(
          restoreAuth({
            token: null,
            refreshToken: null,
            userId: null,
          })
        );
      }
    }

    rehydrateState();
  }, [dispatch]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <AuthInitializer>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthInitializer>
    </Provider>
  );
}

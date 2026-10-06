import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { tokensRefreshed, clearAuth } from "@/store/authSlice";
import {
  getStorageItem,
  removeStorageItem,
  STORAGE_KEYS,
} from "@/lib/storage";

const LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "::1"];
const isLoopback = (host: string): boolean => LOOPBACK_HOSTS.includes(host);

/**
 * Host (LAN IP) of the machine running `expo start`, exposed by @expo/cli
 * during development. Returns null in production or when only a loopback
 * address is available (e.g. Android emulator over adb reverse).
 */
const getDevServerHost = (): string | null => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;
  const host = hostUri.split("/")[0].split(":")[0];
  if (!host || isLoopback(host)) return null;
  return host;
};

export const getBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === "web") {
    // In web browsers, 10.0.2.2 is unreachable (Android emulator alias only)
    if (!envUrl || envUrl.includes("10.0.2.2")) {
      return "http://localhost:8000";
    }
    return envUrl;
  }
  if (envUrl) return envUrl;
  // A physical device has no `localhost` — it must reach the dev machine via
  // its LAN IP, which Expo reports as the dev server's hostUri.
  const devHost = getDevServerHost();
  if (devHost) {
    console.log(`[API] Using dev server host: http://${devHost}:8000`);
    return `http://${devHost}:8000`;
  }
  const fallback =
    Platform.OS === "android"
      ? // Android emulator reaches the host machine through the 10.0.2.2 alias
      "http://10.0.2.2:8000"
      : "http://localhost:8000";
  console.warn(
    `[API] No dev server host found, falling back to ${fallback}. ` +
    "On a physical device, set EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:8000 in app-client/.env"
  );
  return fallback;
};

export const BASE_URL = getBaseUrl();

interface StateWithAuth {
  auth: {
    token: string | null;
    refreshToken: string | null;
    userId: number | null;
  };
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: async (headers, { getState }) => {
    // Patient mode: requests are scoped with the patient token (mirrors the web
    // client, which sends the patient-token as Bearer from the patient UI).
    const patientToken = await getStorageItem(STORAGE_KEYS.PATIENT_TOKEN);
    if (patientToken) {
      headers.set("Authorization", `Bearer ${patientToken}`);
      return headers;
    }
    const token = (getState() as StateWithAuth).auth?.token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

let isRefreshing = false;

const baseQueryWithRefresh: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const state = api.getState() as StateWithAuth;
    const refreshToken =
      state.auth.refreshToken ?? (await getStorageItem(STORAGE_KEYS.REFRESH_TOKEN));
    const userIdRaw =
      state.auth.userId ?? (await getStorageItem(STORAGE_KEYS.USER_ID));
    const userId = userIdRaw ? Number(userIdRaw) : null;

    if (refreshToken && userId && !isRefreshing) {
      isRefreshing = true;
      try {
        const refreshResult = await rawBaseQuery(
          {
            url: "/users/refresh",
            method: "POST",
            body: { user_id: userId, refresh_token: refreshToken },
          },
          api,
          extraOptions
        );

        if (refreshResult.data) {
          const data = (
            refreshResult.data as {
              data?: { access_token: string; refresh_token: string };
            }
          ).data;

          if (data) {
            api.dispatch(tokensRefreshed(data));
            // Retry the original query with the refreshed token
            result = await rawBaseQuery(args, api, extraOptions);
          }
        } else {
          api.dispatch(clearAuth());
        }
      } catch (err) {
        console.error("[RTK Query] Refresh failed:", err);
        api.dispatch(clearAuth());
      } finally {
        isRefreshing = false;
      }
    } else {
      api.dispatch(clearAuth());
    }
  }

  // Expired patient session → clear patient scope so caregiver context resumes
  if (
    result.error?.status === 401 &&
    (await getStorageItem(STORAGE_KEYS.PATIENT_TOKEN))
  ) {
    await removeStorageItem(STORAGE_KEYS.PATIENT_TOKEN);
  }

  // if (result.error && result.error.status !== 401) {
  //   console.warn(`[API Error] status=${result}`, result);
  // }

  return result;
};

export const api = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithRefresh,
  tagTypes: ["User", "Patient", "Person", "Recognition", "Conversation", "Location"],
  endpoints: () => ({}),
});

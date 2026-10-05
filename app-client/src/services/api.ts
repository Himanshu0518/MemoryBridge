import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { Platform } from "react-native";
import { tokensRefreshed, clearAuth } from "@/store/authSlice";
import { getStorageItem, STORAGE_KEYS } from "@/lib/storage";

const DEFAULT_API_URL = Platform.select({
  android: "http://10.0.2.2:8000",
  default: "http://localhost:8000",
});

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

interface StateWithAuth {
  auth: {
    token: string | null;
    refreshToken: string | null;
    userId: number | null;
  };
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { getState }) => {
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

  if (result.error && result.error.status !== 401) {
    console.warn(`[API Error] status=${result.error.status}`, result.error.data);
  }

  return result;
};

export const api = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithRefresh,
  tagTypes: ["User", "Patient", "Person", "Recognition", "Conversation", "Location"],
  endpoints: () => ({}),
});

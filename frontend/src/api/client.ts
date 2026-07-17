import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { env } from "@/lib/env";
import { useAuthStore } from "@/stores/authStore";

export const apiClient = axios.create({
  baseURL: `${env.apiBaseUrl}/v1`,
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const session = useAuthStore.getState().session;
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

// Refresh-token rotation: the backend revokes the whole token family on a
// replayed/expired refresh token, so a failed refresh must force logout
// rather than retry — there's nothing left to recover.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const session = useAuthStore.getState().session;
  if (!session) throw new Error("No session to refresh");

  const { data } = await axios.post<{
    accessToken: string;
    refreshToken: string;
    userId: string;
    accessLevel: string;
    registrationComplete: boolean;
  }>(`${env.apiBaseUrl}/v1/auth/refresh`, { refreshToken: session.refreshToken });

  useAuthStore.getState().setSession({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    userId: data.userId,
    accessLevel: data.accessLevel as never,
    registrationComplete: data.registrationComplete,
  });

  return data.accessToken;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = error.response?.status;
    const isRefreshCall = original?.url?.includes("/auth/refresh");

    if (status === 401 && original && !original._retried && !isRefreshCall && useAuthStore.getState().session) {
      original._retried = true;
      try {
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      } catch {
        useAuthStore.getState().clear();
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export interface ApiErrorBody {
  message: string | string[];
  error?: string;
  statusCode: number;
}

export function extractErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined;
    if (body?.message) {
      return Array.isArray(body.message) ? body.message.join(" ") : body.message;
    }
    if (error.code === "ECONNABORTED") return "The request timed out. Check your connection and try again.";
    if (!error.response) return "Can't reach Stignit right now. Check your connection.";
  }
  return fallback;
}

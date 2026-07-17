import { apiClient } from "./client";
import type { OtpRequestResult, VerifyResult } from "./types";

export const authApi = {
  requestOtp: (phone: string) => apiClient.post<OtpRequestResult>("/auth/otp/request", { phone }).then((r) => r.data),

  verifyOtp: (phone: string, code: string) =>
    apiClient.post<VerifyResult>("/auth/otp/verify", { phone, code }).then((r) => r.data),

  logout: (refreshToken: string) => apiClient.post<void>("/auth/logout", { refreshToken }),
};

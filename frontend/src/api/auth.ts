import { apiClient } from "./client";
import type { OtpRequestResult, VerifyResult } from "./types";

export const authApi = {
  requestOtp: (phone: string) => apiClient.post<OtpRequestResult>("/auth/otp/request", { phone }).then((r) => r.data),

  verifyOtp: (phone: string, code: string) =>
    apiClient.post<VerifyResult>("/auth/otp/verify", { phone, code }).then((r) => r.data),

  requestEmailOtp: (email: string) =>
    apiClient.post<OtpRequestResult>("/auth/otp/email/request", { email }).then((r) => r.data),

  verifyEmailOtp: (email: string, code: string) =>
    apiClient.post<VerifyResult>("/auth/otp/email/verify", { email, code }).then((r) => r.data),

  logout: (refreshToken: string) => apiClient.post<void>("/auth/logout", { refreshToken }),
};

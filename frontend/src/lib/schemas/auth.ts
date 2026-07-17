import { z } from "zod";

export const phoneSchema = z.object({
  localNumber: z
    .string()
    .trim()
    .regex(/^[789]\d{9}$/, "Enter a valid 10-digit Nigerian mobile number"),
});
export type PhoneFormValues = z.infer<typeof phoneSchema>;

export const otpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});
export type OtpFormValues = z.infer<typeof otpSchema>;

export function toE164(localNumber: string): string {
  return `+234${localNumber}`;
}

export function formatNigerianPhone(e164: string): string {
  // +2348012345678 -> 0801 234 5678
  const digits = e164.replace("+234", "0");
  return digits.replace(/^(\d{4})(\d{3})(\d{4})$/, "$1 $2 $3");
}

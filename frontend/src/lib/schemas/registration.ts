import { z } from "zod";

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export const identitySchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(255),
  dateOfBirth: z
    .string()
    .min(1, "Select your date of birth")
    .refine((val) => calculateAge(val) >= 16, "You must be at least 16 years old to register"),
  stateName: z.string().min(1, "Select your state"),
  lga: z.string().trim().min(2, "Enter your Local Government Area").max(90),
});
export type IdentityFormValues = z.infer<typeof identitySchema>;

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(255),
  localNumber: z
    .string()
    .trim()
    .regex(/^[789]\d{9}$/, "Enter a valid 10-digit Nigerian mobile number"),
  relationship: z.string().trim().min(1, "Enter a relationship").max(100),
});
export type ContactFormValues = z.infer<typeof contactSchema>;

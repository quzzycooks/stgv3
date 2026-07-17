import { apiClient } from "./client";
import type {
  EmergencyContact,
  EmergencyContactInput,
  MedicalInfo,
  RegisterInput,
  SubmitSkillInput,
  UpdateProfileInput,
  UserProfile,
} from "./types";

export const usersApi = {
  register: (input: RegisterInput) => apiClient.post<{ id: string; accessLevel: string }>("/users/register", input).then((r) => r.data),

  me: () => apiClient.get<UserProfile>("/users/me").then((r) => r.data),

  updateMe: (input: UpdateProfileInput) => apiClient.put<void>("/users/me", input),

  exportMe: () => apiClient.get<Record<string, unknown>>("/users/me/export").then((r) => r.data),

  deleteMe: () => apiClient.delete<{ scheduledFor: string }>("/users/me").then((r) => r.data),

  listEmergencyContacts: () => apiClient.get<EmergencyContact[]>("/users/me/emergency-contacts").then((r) => r.data),

  addEmergencyContact: (input: EmergencyContactInput) =>
    apiClient.post<EmergencyContact>("/users/me/emergency-contacts", input).then((r) => r.data),

  deleteEmergencyContact: (contactId: string) => apiClient.delete<void>(`/users/me/emergency-contacts/${contactId}`),

  submitSkill: (input: SubmitSkillInput) => apiClient.post<void>("/users/me/skill", input),

  getMedicalInfo: (targetUserId: string, incidentId: string) =>
    apiClient
      .get<MedicalInfo | null>(`/users/${targetUserId}/medical`, { params: { incidentId } })
      .then((r) => r.data),
};

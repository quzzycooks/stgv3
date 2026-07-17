import { apiClient } from "./client";
import type { BreakoutRole, ModerationAction } from "@/lib/enums";
import type { BreakoutMessage } from "./types";

export const breakoutApi = {
  join: (incidentId: string) => apiClient.post<void>(`/incidents/${incidentId}/breakout/join`),

  messages: (incidentId: string) =>
    apiClient.get<BreakoutMessage[]>(`/incidents/${incidentId}/breakout`).then((r) => r.data),

  send: (incidentId: string, content: string) =>
    apiClient.post<BreakoutMessage>(`/incidents/${incidentId}/breakout/messages`, { content }).then((r) => r.data),

  acceptRole: (incidentId: string, role: BreakoutRole) =>
    apiClient.post<void>(`/incidents/${incidentId}/breakout/roles`, { role }),

  moderate: (incidentId: string, targetUserId: string, action: ModerationAction) =>
    apiClient.post<void>(`/incidents/${incidentId}/breakout/moderate`, { targetUserId, action }),

  askAi: (incidentId: string, question: string) =>
    apiClient.post<{ answer: string }>(`/incidents/${incidentId}/breakout/ai`, { question }).then((r) => r.data),
};

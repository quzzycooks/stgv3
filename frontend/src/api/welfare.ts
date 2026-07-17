import { apiClient } from "./client";
import type { WelfareResponse } from "@/lib/enums";

export const welfareApi = {
  respond: (sessionId: string, response: WelfareResponse) =>
    apiClient.post<void>(`/welfare/${sessionId}/respond`, { response }),

  cancel: (incidentId: string) => apiClient.post<void>(`/welfare/incidents/${incidentId}/cancel`),
};

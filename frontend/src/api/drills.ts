import { apiClient } from "./client";
import type { DrillCategory } from "@/lib/enums";
import type { DrillResponseResult, StartDrillSessionResult } from "./types";

export const drillsApi = {
  startSession: (category?: DrillCategory) =>
    apiClient.post<StartDrillSessionResult>("/drills/sessions", { category }).then((r) => r.data),

  submitResponse: (
    sessionId: string,
    input: { chosenOptionId: string; timeToDecisionMs: number; hesitationEvents: number },
  ) => apiClient.post<DrillResponseResult>(`/drills/sessions/${sessionId}/response`, input).then((r) => r.data),
};

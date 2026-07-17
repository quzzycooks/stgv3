import { apiClient } from "./client";
import type { IncidentType } from "@/lib/enums";
import type { Gps } from "./types";

export interface AnomalyReportInput {
  compositeScore: number;
  gps: Gps;
  incidentTypeHint?: IncidentType;
  speedKph?: number;
  amplitudeSpike?: boolean;
}

export const detectionApi = {
  reportAnomaly: (input: AnomalyReportInput) =>
    apiClient.post<{ sessionId?: string; welfareCheckStarted: boolean }>("/detection/anomaly", input).then((r) => r.data),
};

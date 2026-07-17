import { apiClient } from "./client";
import type { IncidentStatus } from "@/lib/enums";
import type { Gps, Incident, IncidentDna, ManualTriggerInput } from "./types";

export const incidentsApi = {
  trigger: (input: ManualTriggerInput) =>
    apiClient.post<{ incidentId: string; status: string }>("/incidents", input).then((r) => r.data),

  updateLocation: (gps: Gps) => apiClient.post<{ ok: true }>("/incidents/location", { gps }),

  get: (incidentId: string) => apiClient.get<Incident>(`/incidents/${incidentId}`).then((r) => r.data),

  confirmProximity: (incidentId: string, present: boolean) =>
    apiClient.post<void>(`/incidents/${incidentId}/participants/confirm-proximity`, { present }),

  transitionStatus: (incidentId: string, to: IncidentStatus, reason?: string) =>
    apiClient.post<void>(`/incidents/${incidentId}/status`, { to, reason }),

  summary: (incidentId: string) => apiClient.get<IncidentDna>(`/incidents/${incidentId}/summary`).then((r) => r.data),
};

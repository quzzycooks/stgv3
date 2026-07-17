import { apiClient } from "./client";
import type { HospitalRecommendation, TransportStatus } from "./types";

export const transportApi = {
  status: (incidentId: string) => apiClient.get<TransportStatus>(`/incidents/${incidentId}/transport`).then((r) => r.data),

  dispatch: (incidentId: string) => apiClient.post<TransportStatus>(`/incidents/${incidentId}/transport/dispatch`).then((r) => r.data),

  hospitalRecommendation: (incidentId: string, lat: number, lng: number, cardiac?: boolean) =>
    apiClient
      .get<HospitalRecommendation>(`/incidents/${incidentId}/transport/hospital-recommendation`, {
        params: { lat, lng, cardiac: cardiac ?? undefined },
      })
      .then((r) => r.data),
};

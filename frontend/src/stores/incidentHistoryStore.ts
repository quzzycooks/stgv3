import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * stignit-api has no "list my incidents" endpoint. This store is the
 * device-local record of incident IDs this device created or joined, used
 * to rehydrate "recent incidents" via GET /v1/incidents/:id. It is NOT a
 * server-side history — the UI must present it as such.
 */
interface IncidentHistoryState {
  incidentIds: string[];
  addIncident: (incidentId: string) => void;
}

export const useIncidentHistoryStore = create<IncidentHistoryState>()(
  persist(
    (set) => ({
      incidentIds: [],
      addIncident: (incidentId) =>
        set((state) => ({
          incidentIds: [incidentId, ...state.incidentIds.filter((id) => id !== incidentId)].slice(0, 20),
        })),
    }),
    { name: "stignit.incident-history" },
  ),
);

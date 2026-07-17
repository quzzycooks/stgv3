import { create } from "zustand";
import type { StartDrillSessionResult } from "@/api/types";

interface DrillState {
  activeSession: StartDrillSessionResult | null;
  setActiveSession: (session: StartDrillSessionResult | null) => void;
}

/** Holds the in-flight drill session — stignit-api has no "get session by id" endpoint, only start/submit. */
export const useDrillStore = create<DrillState>()((set) => ({
  activeSession: null,
  setActiveSession: (activeSession) => set({ activeSession }),
}));

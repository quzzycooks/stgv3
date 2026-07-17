import { create } from "zustand";
import type { ConsentCategory } from "@/lib/enums";
import type { EmergencyContactInput, MedicalInfo } from "@/api/types";

interface RegistrationState {
  fullName: string;
  dateOfBirth: string;
  stateName: string;
  lga: string;
  profilePhotoUrl?: string;
  emergencyContacts: EmergencyContactInput[];
  medicalInfo: MedicalInfo;
  consents: Record<ConsentCategory, boolean>;

  setIdentity: (fields: Partial<Pick<RegistrationState, "fullName" | "dateOfBirth" | "stateName" | "lga" | "profilePhotoUrl">>) => void;
  setEmergencyContacts: (contacts: EmergencyContactInput[]) => void;
  setMedicalInfo: (info: MedicalInfo) => void;
  setConsent: (category: ConsentCategory, granted: boolean) => void;
  reset: () => void;
}

const defaultConsents: Record<ConsentCategory, boolean> = {
  LOCATION_FOREGROUND: true,
  LOCATION_BACKGROUND: false,
  MEDICAL_PROCESSING: true,
  EMERGENCY_CONTACT_NOTIFY: true,
  DATA_MODEL_TRAINING: false,
  MICROPHONE_DETECTION: false,
};

const initialState = {
  fullName: "",
  dateOfBirth: "",
  stateName: "",
  lga: "",
  profilePhotoUrl: undefined,
  emergencyContacts: [],
  medicalInfo: {},
  consents: defaultConsents,
};

export const useRegistrationStore = create<RegistrationState>()((set) => ({
  ...initialState,
  setIdentity: (fields) => set((state) => ({ ...state, ...fields })),
  setEmergencyContacts: (emergencyContacts) => set({ emergencyContacts }),
  setMedicalInfo: (medicalInfo) => set({ medicalInfo }),
  setConsent: (category, granted) => set((state) => ({ consents: { ...state.consents, [category]: granted } })),
  reset: () => set(initialState),
}));

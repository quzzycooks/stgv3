import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AccessLevel } from "@/lib/enums";

interface Session {
  accessToken: string;
  refreshToken: string;
  userId: string;
  accessLevel: AccessLevel;
  registrationComplete: boolean;
}

interface AuthState {
  session: Session | null;
  hydrated: boolean;
  setSession: (session: Session) => void;
  updateAccessLevel: (accessLevel: AccessLevel) => void;
  setRegistrationComplete: (complete: boolean) => void;
  clear: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      hydrated: false,
      setSession: (session) => set({ session }),
      updateAccessLevel: (accessLevel) =>
        set((state) => (state.session ? { session: { ...state.session, accessLevel } } : state)),
      setRegistrationComplete: (registrationComplete) =>
        set((state) => (state.session ? { session: { ...state.session, registrationComplete } } : state)),
      clear: () => set({ session: null }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "stignit.auth",
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

export const isAuthenticated = () => useAuthStore.getState().session !== null;

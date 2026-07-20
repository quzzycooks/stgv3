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
  redirectAfterAuth: string | null;
  setSession: (session: Session) => void;
  updateAccessLevel: (accessLevel: AccessLevel) => void;
  setRegistrationComplete: (complete: boolean) => void;
  clear: () => void;
  setHydrated: () => void;
  setRedirectAfterAuth: (path: string | null) => void;
  consumeRedirectAfterAuth: () => string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      hydrated: false,
      redirectAfterAuth: null,
      setSession: (session) => set({ session }),
      updateAccessLevel: (accessLevel) =>
        set((state) => (state.session ? { session: { ...state.session, accessLevel } } : state)),
      setRegistrationComplete: (registrationComplete) =>
        set((state) => (state.session ? { session: { ...state.session, registrationComplete } } : state)),
      clear: () => set({ session: null }),
      setHydrated: () => set({ hydrated: true }),
      setRedirectAfterAuth: (redirectAfterAuth) => set({ redirectAfterAuth }),
      consumeRedirectAfterAuth: () => {
        const path = get().redirectAfterAuth;
        set({ redirectAfterAuth: null });
        return path;
      },
    }),
    {
      name: "stignit.auth",
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

export const isAuthenticated = () => useAuthStore.getState().session !== null;

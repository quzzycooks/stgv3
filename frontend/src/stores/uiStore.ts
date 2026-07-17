import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  onboardingComplete: boolean;
  completeOnboarding: () => void;
  quickUnlockEnabled: boolean;
  setQuickUnlockEnabled: (enabled: boolean) => void;
  /** Set once per app load after the unlock gate has been passed, so we don't re-prompt on every route change. */
  unlockedThisSession: boolean;
  markUnlockedThisSession: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      onboardingComplete: false,
      completeOnboarding: () => set({ onboardingComplete: true }),
      quickUnlockEnabled: false,
      setQuickUnlockEnabled: (quickUnlockEnabled) => set({ quickUnlockEnabled }),
      unlockedThisSession: false,
      markUnlockedThisSession: () => set({ unlockedThisSession: true }),
    }),
    {
      name: "stignit.ui",
      partialize: (state) => ({
        onboardingComplete: state.onboardingComplete,
        quickUnlockEnabled: state.quickUnlockEnabled,
      }),
    },
  ),
);

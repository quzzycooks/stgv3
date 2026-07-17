import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldHalf } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";

export function SplashPage() {
  const navigate = useNavigate();
  const hydrated = useAuthStore((s) => s.hydrated);
  const session = useAuthStore((s) => s.session);
  const onboardingComplete = useUiStore((s) => s.onboardingComplete);
  const quickUnlockEnabled = useUiStore((s) => s.quickUnlockEnabled);
  const unlockedThisSession = useUiStore((s) => s.unlockedThisSession);

  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => {
      if (session?.registrationComplete && quickUnlockEnabled && !unlockedThisSession) {
        navigate("/unlock", { replace: true });
      } else if (session?.registrationComplete) {
        navigate("/home", { replace: true });
      } else if (session) {
        navigate("/register/identity", { replace: true });
      } else if (!onboardingComplete) {
        navigate("/onboarding", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    }, 1400);
    return () => clearTimeout(timer);
  }, [hydrated, session, onboardingComplete, quickUnlockEnabled, unlockedThisSession, navigate]);

  return (
    <div className="app-shell flex min-h-dvh flex-col items-center justify-center bg-primary">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="flex flex-col items-center gap-5"
      >
        <div className="relative grid h-24 w-24 place-items-center rounded-4xl bg-white/15">
          <motion.span
            className="absolute inset-0 rounded-4xl border-2 border-white/40"
            animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <ShieldHalf size={44} className="text-white" strokeWidth={2} />
        </div>
        <div className="text-center">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">Stignit</h1>
          <p className="mt-1 text-sm font-medium text-white/75">Trusted response, every second counts</p>
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-16 flex gap-1.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-white/70"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </motion.div>
    </div>
  );
}

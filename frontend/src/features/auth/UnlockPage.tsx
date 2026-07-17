import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Fingerprint, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useUiStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { verifyQuickUnlock } from "@/lib/webauthn";
import { cn } from "@/lib/cn";

export function UnlockPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"idle" | "verifying" | "failed">("idle");
  const markUnlockedThisSession = useUiStore((s) => s.markUnlockedThisSession);
  const clearSession = useAuthStore((s) => s.clear);

  const attempt = async () => {
    setStatus("verifying");
    const ok = await verifyQuickUnlock();
    if (ok) {
      markUnlockedThisSession();
      navigate("/home", { replace: true });
    } else {
      setStatus("failed");
    }
  };

  const useCodeInstead = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-shell flex min-h-dvh flex-col items-center justify-center bg-canvas safe-top safe-bottom px-8">
      <motion.button
        onClick={attempt}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "relative grid h-28 w-28 place-items-center rounded-4xl text-white shadow-glow-primary transition-colors",
          status === "failed" ? "bg-primary" : "bg-accent",
        )}
      >
        {status === "verifying" && (
          <motion.span
            className="absolute inset-0 rounded-4xl border-2 border-white/50"
            animate={{ scale: [1, 1.2, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        )}
        <Fingerprint size={48} strokeWidth={1.75} />
      </motion.button>

      <h1 className="mt-8 font-display text-xl font-bold text-body">Unlock Stignit</h1>
      <p className="mt-2 text-center text-sm text-muted">
        {status === "failed" ? "Couldn't verify — tap to try again." : "Use Face ID or your fingerprint to continue."}
      </p>

      <Button onClick={attempt} size="lg" fullWidth className="mt-10" loading={status === "verifying"}>
        Unlock
      </Button>

      <button onClick={useCodeInstead} className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-muted">
        <LogOut size={15} /> Use phone number instead
      </button>
    </div>
  );
}

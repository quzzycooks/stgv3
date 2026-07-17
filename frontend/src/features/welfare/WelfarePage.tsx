import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, HeartPulse } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Button } from "@/components/ui/Button";
import { welfareApi } from "@/api/welfare";
import { usersApi } from "@/api/users";
import { useIncidentHistoryStore } from "@/stores/incidentHistoryStore";

type Phase = "prompting" | "responding" | "safe" | "escalating";

export function WelfarePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { state } = useLocation();
  const incidentId = (state as { incidentId?: string } | null)?.incidentId;
  const navigate = useNavigate();
  const addIncident = useIncidentHistoryStore((s) => s.addIncident);

  const { data: profile } = useQuery({ queryKey: ["me"], queryFn: usersApi.me });
  const delaySec = profile?.welfareCheckDelaySec ?? 120;

  const [remaining, setRemaining] = useState(delaySec);
  const [phase, setPhase] = useState<Phase>("prompting");

  useEffect(() => setRemaining(delaySec), [delaySec]);

  useEffect(() => {
    if (phase !== "prompting") return;
    if (remaining <= 0) {
      void escalate();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, remaining]);

  const escalate = async () => {
    if (!sessionId) return;
    setPhase("escalating");
    try {
      await welfareApi.respond(sessionId, "NEED_HELP");
    } catch {
      // Server-side timeout already escalates independently — a failed client call here isn't fatal.
    }
    if (incidentId) addIncident(incidentId);
    setTimeout(() => {
      navigate(incidentId ? `/incidents/${incidentId}` : "/home", { replace: true });
    }, 1800);
  };

  const respondSafe = async () => {
    if (!sessionId) return;
    setPhase("responding");
    try {
      await welfareApi.respond(sessionId, "SAFE");
    } finally {
      setPhase("safe");
      setTimeout(() => navigate("/home", { replace: true }), 1600);
    }
  };

  const respondNeedHelp = () => escalate();

  return (
    <div className="app-shell flex min-h-dvh flex-col items-center justify-center bg-primary px-8 text-center">
      {phase === "prompting" && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
          <ProgressRing progress={1 - remaining / delaySec} size={160} strokeWidth={8} color="#ffffff" trackColor="rgb(255 255 255 / 0.25)">
            <div className="flex flex-col items-center">
              <span className="font-display text-3xl font-extrabold text-white">
                {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
              </span>
            </div>
          </ProgressRing>

          <h1 className="mt-8 font-display text-2xl font-extrabold text-white">We noticed something unusual</h1>
          <p className="mt-2 max-w-xs text-sm text-white/80">Are you okay? If we don't hear from you, we'll alert your contacts automatically.</p>

          <div className="mt-10 flex w-full flex-col gap-3">
            <Button size="xl" fullWidth variant="secondary" className="!bg-white !text-primary" icon={<Check size={20} />} onClick={respondSafe}>
              I'm Safe
            </Button>
            <button
              onClick={respondNeedHelp}
              className="rounded-3xl border-2 border-white/40 py-4 text-base font-bold text-white"
            >
              I Need Help Now
            </button>
          </div>
        </motion.div>
      )}

      {phase === "responding" || phase === "safe" ? (
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-white/15">
            <Check size={36} className="text-white" />
          </div>
          <h1 className="mt-6 font-display text-xl font-bold text-white">Glad you're safe</h1>
          <p className="mt-1.5 text-sm text-white/75">No alert was sent. Taking you home…</p>
        </motion.div>
      ) : null}

      {phase === "escalating" && (
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
          <div className="relative grid h-20 w-20 place-items-center rounded-full bg-white/15">
            <span className="absolute inset-0 rounded-full border-2 border-white/50 animate-pulse-ring" />
            <HeartPulse size={34} className="text-white" />
          </div>
          <h1 className="mt-6 font-display text-xl font-bold text-white">Alerting your contacts</h1>
          <p className="mt-1.5 text-sm text-white/75">Opening a Situation Room and notifying responders now.</p>
        </motion.div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Car, Flame, HeartPulse, Waves, Users, Baby, Moon, HelpCircle, Shuffle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { drillsApi } from "@/api/drills";
import { usersApi } from "@/api/users";
import { useDrillStore } from "@/stores/drillStore";
import { ACCESS_LEVEL_LABEL, DrillCategory, type DrillCategory as TDrillCategory } from "@/lib/enums";

const CATEGORY_META: Record<TDrillCategory, { label: string; icon: typeof Car }> = {
  RTA: { label: "Road Accidents", icon: Car },
  MEDICAL_COLLAPSE: { label: "Medical Collapse", icon: HeartPulse },
  FIRE: { label: "Fire", icon: Flame },
  DROWNING: { label: "Drowning", icon: Waves },
  CROWD_CRUSH: { label: "Crowd Crush", icon: Users },
  UNKNOWN_VICTIM: { label: "Unknown Victim", icon: HelpCircle },
  CHILD: { label: "Child Casualty", icon: Baby },
  NIGHT: { label: "Night Scenario", icon: Moon },
};

const NEXT_TIER: Record<string, string> = {
  OBSERVER: "Reach 50% correct to unlock Tier 1",
  TIER1: "Reach 70% correct to unlock Tier 2",
  TIER2: "Submit a verified credential to become Skilled",
  SKILLED: "You've reached the highest responder tier",
};

export function DrillsHubPage() {
  const navigate = useNavigate();
  const [starting, setStarting] = useState<TDrillCategory | "adaptive" | null>(null);
  const setActiveSession = useDrillStore((s) => s.setActiveSession);

  const { data: profile } = useQuery({ queryKey: ["me"], queryFn: usersApi.me });

  const start = async (category?: TDrillCategory) => {
    setStarting(category ?? "adaptive");
    try {
      const session = await drillsApi.startSession(category);
      setActiveSession(session);
      navigate(`/drills/session/${session.sessionId}`);
    } finally {
      setStarting(null);
    }
  };

  return (
    <AppShell>
      <div className="safe-top flex items-center gap-3 px-6 pt-5">
        <button onClick={() => navigate(-1)} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-card-elevated text-body">
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-display text-lg font-extrabold text-body">Drills & Training</h1>
      </div>

      <div className="px-6 pt-6">
        <Card className="flex items-center gap-4">
          <ProgressRing progress={(profile?.drillCompletionPct ?? 0) / 100} size={64} color="var(--color-success)">
            <span className="font-display text-sm font-extrabold text-body">{Math.round(profile?.drillCompletionPct ?? 0)}%</span>
          </ProgressRing>
          <div className="min-w-0">
            <p className="font-display font-bold text-body">{ACCESS_LEVEL_LABEL[profile?.accessLevel ?? "OBSERVER"]}</p>
            <p className="mt-0.5 text-xs text-muted">{NEXT_TIER[profile?.accessLevel ?? "OBSERVER"]}</p>
          </div>
        </Card>

        <motion.button
          whileTap={{ scale: 0.98 }}
          disabled={starting !== null}
          onClick={() => start()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-white shadow-glow-primary disabled:opacity-60"
        >
          <Shuffle size={17} /> {starting === "adaptive" ? "Starting…" : "Start adaptive drill"}
        </motion.button>

        <h2 className="mt-7 font-display font-bold text-body">By category</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {DrillCategory.map((category) => {
            const meta = CATEGORY_META[category];
            return (
              <motion.button
                key={category}
                whileTap={{ scale: 0.96 }}
                disabled={starting !== null}
                onClick={() => start(category)}
                className="flex flex-col items-center gap-2.5 rounded-3xl border border-subtle bg-card-elevated p-5 shadow-card disabled:opacity-60"
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-tint-accent text-accent">
                  <meta.icon size={20} />
                </div>
                <span className="text-center text-sm font-semibold text-body">{meta.label}</span>
              </motion.button>
            );
          })}
        </div>

        <button
          onClick={() => navigate("/skill-verification")}
          className="mt-6 mb-8 flex w-full items-center justify-center rounded-2xl border border-subtle bg-card-elevated py-4 text-sm font-semibold text-accent"
        >
          Submit a professional credential →
        </button>
      </div>
    </AppShell>
  );
}

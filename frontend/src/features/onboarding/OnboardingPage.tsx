import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Users, Ambulance, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/lib/cn";

const slides = [
  {
    icon: Activity,
    tone: "primary" as const,
    title: "Detects the moment it matters",
    description:
      "Stignit's on-device sensors recognise the signature of a crash or collapse in real time — no need to reach for your phone.",
  },
  {
    icon: Users,
    tone: "accent" as const,
    title: "Opens a Situation Room instantly",
    description:
      "The moment help is needed, your emergency contacts are alerted and a live coordination room opens around you.",
  },
  {
    icon: Ambulance,
    tone: "success" as const,
    title: "Coordinated response, not chaos",
    description:
      "Verified responders organise on the scene, transport is dispatched, and the nearest capable hospital is briefed before you arrive.",
  },
];

const toneStyles = {
  primary: { bg: "bg-primary", tint: "bg-tint-primary", text: "text-primary" },
  accent: { bg: "bg-accent", tint: "bg-tint-accent", text: "text-accent" },
  success: { bg: "bg-success", tint: "bg-tint-success", text: "text-success" },
};

export function OnboardingPage() {
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();
  const completeOnboarding = useUiStore((s) => s.completeOnboarding);
  const slide = slides[index];
  const tone = toneStyles[slide.tone];
  const isLast = index === slides.length - 1;

  const finish = () => {
    completeOnboarding();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-shell flex min-h-dvh flex-col bg-canvas safe-top safe-bottom">
      <div className="flex justify-end p-5">
        {!isLast && (
          <button onClick={finish} className="text-sm font-semibold text-muted">
            Skip
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex w-full flex-col items-center text-center"
          >
            <div className={cn("relative mb-10 grid h-56 w-56 place-items-center rounded-4xl", tone.tint)}>
              <motion.span
                className={cn("absolute h-40 w-40 rounded-full opacity-30", tone.bg)}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className={cn("relative grid h-24 w-24 place-items-center rounded-3xl text-white shadow-elevated", tone.bg)}>
                <slide.icon size={40} strokeWidth={2} />
              </div>
            </div>

            <h1 className="font-display text-[26px] font-extrabold leading-tight text-body">{slide.title}</h1>
            <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-muted">{slide.description}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex flex-col items-center gap-8 px-8 pb-8">
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <motion.span
              key={i}
              className={cn("h-2 rounded-full", i === index ? tone.bg : "bg-[var(--border-strong)]")}
              animate={{ width: i === index ? 24 : 8 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          ))}
        </div>

        <Button
          fullWidth
          size="xl"
          icon={<ArrowRight size={20} />}
          iconPosition="right"
          onClick={() => (isLast ? finish() : setIndex((i) => i + 1))}
        >
          {isLast ? "Get Started" : "Continue"}
        </Button>
      </div>
    </div>
  );
}

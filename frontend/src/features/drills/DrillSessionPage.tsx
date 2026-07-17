import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { drillsApi } from "@/api/drills";
import { useDrillStore } from "@/stores/drillStore";
import type { DrillResponseResult } from "@/api/types";
import { cn } from "@/lib/cn";

export function DrillSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useDrillStore((s) => s.activeSession);
  const setActiveSession = useDrillStore((s) => s.setActiveSession);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DrillResponseResult | null>(null);
  const startedAt = useRef(Date.now());
  const hesitations = useRef(0);
  const lastMoveAt = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastMoveAt.current > 3000) {
        hesitations.current += 1;
        lastMoveAt.current = Date.now();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!session || session.sessionId !== sessionId) {
    return (
      <div className="app-shell flex min-h-dvh flex-col items-center justify-center bg-canvas px-8 text-center">
        <p className="text-sm text-muted">This drill session has expired.</p>
        <Button className="mt-5" onClick={() => navigate("/drills")}>
          Back to Drills
        </Button>
      </div>
    );
  }

  const { scenario } = session;

  const submit = async (optionId: string) => {
    setSelectedId(optionId);
    setSubmitting(true);
    try {
      const response = await drillsApi.submitResponse(session.sessionId, {
        chosenOptionId: optionId,
        timeToDecisionMs: Date.now() - startedAt.current,
        hesitationEvents: hesitations.current,
      });
      setResult(response);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    } finally {
      setSubmitting(false);
    }
  };

  const finish = () => {
    setActiveSession(null);
    navigate("/drills", { replace: true });
  };

  return (
    <div className="app-shell flex min-h-dvh flex-col bg-canvas safe-top safe-bottom">
      <div className="flex items-center justify-between px-6 pt-5">
        <span className="rounded-full bg-tint-accent px-3 py-1.5 text-xs font-bold text-accent">{scenario.difficulty}</span>
        <button onClick={finish} aria-label="Exit drill" className="grid h-10 w-10 place-items-center rounded-full bg-card-elevated text-body">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 px-6 pt-6">
        <h1 className="font-display text-xl font-bold leading-snug text-body">{scenario.prompt}</h1>

        <div className="mt-6 flex flex-col gap-3">
          {scenario.options.map((option) => {
            const isSelected = selectedId === option.id;
            const isCorrectOption = result?.correctOptionId === option.id;
            const showFeedback = Boolean(result) && (isSelected || isCorrectOption);
            const showAsCorrect = showFeedback && isCorrectOption;
            const showAsWrong = showFeedback && isSelected && !result?.correct;

            return (
              <motion.button
                key={option.id}
                whileTap={{ scale: selectedId ? 1 : 0.98 }}
                disabled={Boolean(selectedId)}
                onClick={() => {
                  lastMoveAt.current = Date.now();
                  submit(option.id);
                }}
                className={cn(
                  "rounded-2xl border p-4 text-left text-sm font-medium transition-colors",
                  showAsCorrect && "border-success bg-tint-success text-success",
                  showAsWrong && "border-primary bg-tint-primary text-primary",
                  !showFeedback && "border-subtle bg-card-elevated text-body",
                  result && !isSelected && !isCorrectOption && "opacity-50",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span>{option.text}</span>
                  {showAsCorrect && <CheckCircle2 size={18} />}
                  {showAsWrong && <XCircle size={18} />}
                </div>
              </motion.button>
            );
          })}
        </div>

        {submitting && <p className="mt-4 text-center text-xs text-faint">Checking your answer…</p>}

        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-2xl border border-subtle bg-card-elevated p-4">
            <p className={cn("text-sm font-bold", result.correct ? "text-success" : "text-primary")}>
              {result.correct ? `Correct — +${result.pointsEarned} points` : "Not quite"}
            </p>
            <p className="mt-1.5 text-sm text-muted">{result.explanation}</p>
            {result.gamingFlagged && (
              <p className="mt-2 text-xs text-warning">That was answered very fast — take your time on real scenarios.</p>
            )}
          </motion.div>
        )}
      </div>

      {result && (
        <div className="px-6 pb-8">
          <Button size="lg" fullWidth onClick={finish}>
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}

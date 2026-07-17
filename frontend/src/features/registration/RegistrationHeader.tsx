import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";

const STEPS = ["Identity", "Contacts", "Medical", "Consent", "Review"];

export function RegistrationHeader({ step, backTo }: { step: number; backTo?: string }) {
  const navigate = useNavigate();

  return (
    <div className="safe-top px-6 pt-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
          aria-label="Back"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card-elevated text-body"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex flex-1 gap-1.5">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div className={cn("h-1.5 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-[var(--border-subtle)]")} />
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-faint">
        Step {step + 1} of {STEPS.length} — {STEPS[step]}
      </p>
    </div>
  );
}

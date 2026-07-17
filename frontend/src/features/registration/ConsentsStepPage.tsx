import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { RegistrationHeader } from "./RegistrationHeader";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { useRegistrationStore } from "@/stores/registrationStore";
import { ConsentCategory, CONSENT_CATEGORY_LABEL } from "@/lib/enums";

export function ConsentsStepPage() {
  const navigate = useNavigate();
  const { consents, setConsent } = useRegistrationStore();

  return (
    <div className="app-shell flex min-h-dvh flex-col bg-canvas safe-bottom">
      <RegistrationHeader step={3} backTo="/register/medical" />

      <div className="flex flex-1 flex-col px-6 pt-6">
        <h1 className="font-display text-2xl font-extrabold text-body">Your data, your choice</h1>
        <p className="mt-1.5 text-[15px] text-muted">
          Control what Stignit can do on your behalf. You can revisit these in Settings any time.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {ConsentCategory.map((category) => {
            const meta = CONSENT_CATEGORY_LABEL[category];
            return (
              <div
                key={category}
                className="flex items-start justify-between gap-4 rounded-2xl border border-subtle bg-card-elevated p-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-body text-[15px]">{meta.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{meta.description}</p>
                </div>
                <Switch
                  checked={consents[category]}
                  onChange={(granted) => setConsent(category, granted)}
                  aria-label={meta.title}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-2xl bg-tint-accent px-4 py-3 text-xs text-accent">
          <ShieldCheck size={16} className="mt-0.5 shrink-0" />
          <span>Location and emergency-contact notification are core to how Stignit protects you — we recommend keeping them on.</span>
        </div>

        <div className="flex-1" />
        <Button size="lg" fullWidth className="mt-8 mb-6" onClick={() => navigate("/register/review")}>
          Continue
        </Button>
      </div>
    </div>
  );
}

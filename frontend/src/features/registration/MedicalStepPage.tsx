import { useNavigate } from "react-router-dom";
import { Droplet } from "lucide-react";
import { RegistrationHeader } from "./RegistrationHeader";
import { Button } from "@/components/ui/Button";
import { TagInput } from "@/components/ui/TagInput";
import { useRegistrationStore } from "@/stores/registrationStore";
import { BLOOD_TYPES } from "@/lib/nigerianStates";
import { cn } from "@/lib/cn";

export function MedicalStepPage() {
  const navigate = useNavigate();
  const { medicalInfo, setMedicalInfo } = useRegistrationStore();

  const proceed = () => navigate("/register/consents");

  return (
    <div className="app-shell flex min-h-dvh flex-col bg-canvas safe-bottom">
      <RegistrationHeader step={2} backTo="/register/contacts" />

      <div className="flex flex-1 flex-col px-6 pt-6">
        <h1 className="font-display text-2xl font-extrabold text-body">Medical information</h1>
        <p className="mt-1.5 text-[15px] text-muted">
          Optional, but it helps a verified responder treat you correctly. Only visible during an open incident you're part of.
        </p>

        <div className="mt-6 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-muted px-0.5">
              <Droplet size={14} /> Blood type
            </label>
            <div className="grid grid-cols-4 gap-2">
              {BLOOD_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMedicalInfo({ ...medicalInfo, bloodType: type })}
                  className={cn(
                    "rounded-2xl border py-3 text-sm font-bold transition-colors",
                    medicalInfo.bloodType === type
                      ? "border-primary bg-tint-primary text-primary"
                      : "border-subtle bg-card-elevated text-body",
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <TagInput
            label="Existing conditions"
            placeholder="e.g. Asthma, Diabetes"
            values={medicalInfo.conditions ?? []}
            onChange={(conditions) => setMedicalInfo({ ...medicalInfo, conditions })}
          />
          <TagInput
            label="Current medications"
            placeholder="e.g. Insulin"
            values={medicalInfo.medications ?? []}
            onChange={(medications) => setMedicalInfo({ ...medicalInfo, medications })}
          />
          <TagInput
            label="Allergies"
            placeholder="e.g. Penicillin"
            values={medicalInfo.allergies ?? []}
            onChange={(allergies) => setMedicalInfo({ ...medicalInfo, allergies })}
          />
        </div>

        <div className="flex-1" />
        <div className="mt-8 mb-6 flex flex-col gap-3">
          <Button size="lg" fullWidth onClick={proceed}>
            Continue
          </Button>
          <button onClick={proceed} className="text-sm font-semibold text-muted">
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

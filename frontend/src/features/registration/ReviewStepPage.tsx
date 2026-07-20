import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Check, Pencil, User, Users, HeartPulse, ShieldCheck } from "lucide-react";
import { RegistrationHeader } from "./RegistrationHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useRegistrationStore } from "@/stores/registrationStore";
import { useAuthStore } from "@/stores/authStore";
import { usersApi } from "@/api/users";
import { extractErrorMessage } from "@/api/client";
import type { ConsentInput, RegisterInput } from "@/api/types";

export function ReviewStepPage() {
  const navigate = useNavigate();
  const registration = useRegistrationStore();
  const setRegistrationComplete = useAuthStore((s) => s.setRegistrationComplete);
  const updateAccessLevel = useAuthStore((s) => s.updateAccessLevel);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);

    const consents: ConsentInput[] = Object.entries(registration.consents).map(([category, granted]) => ({
      category: category as ConsentInput["category"],
      granted,
    }));

    const payload: RegisterInput = {
      fullName: registration.fullName,
      dateOfBirth: registration.dateOfBirth,
      stateLga: `${registration.stateName}, ${registration.lga}`,
      profilePhotoUrl: registration.profilePhotoUrl,
      emergencyContacts: registration.emergencyContacts,
      medicalInfo: registration.medicalInfo,
      consents,
    };

    try {
      const result = await usersApi.register(payload);
      updateAccessLevel(result.accessLevel as never);
      setRegistrationComplete(true);
      registration.reset();
      const redirect = useAuthStore.getState().consumeRedirectAfterAuth() ?? "/home";
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err, "We couldn't complete your registration. Please review your details."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-shell flex min-h-dvh flex-col bg-canvas safe-bottom">
      <RegistrationHeader step={4} backTo="/register/consents" />

      <div className="flex flex-1 flex-col px-6 pt-6">
        <h1 className="font-display text-2xl font-extrabold text-body">Review & confirm</h1>
        <p className="mt-1.5 text-[15px] text-muted">Make sure everything is correct before you're protected.</p>

        <div className="mt-6 flex flex-col gap-3">
          <SummaryCard
            icon={User}
            title="Identity"
            editTo="/register/identity"
            rows={[
              ["Name", registration.fullName],
              ["Date of birth", registration.dateOfBirth],
              ["Location", `${registration.stateName}, ${registration.lga}`],
            ]}
          />
          <SummaryCard
            icon={Users}
            title={`Emergency Contacts (${registration.emergencyContacts.length})`}
            editTo="/register/contacts"
            rows={registration.emergencyContacts.map((c) => [c.relationship, `${c.name} · ${c.phone}`])}
          />
          <SummaryCard
            icon={HeartPulse}
            title="Medical Info"
            editTo="/register/medical"
            rows={[
              ["Blood type", registration.medicalInfo.bloodType ?? "Not provided"],
              ["Conditions", registration.medicalInfo.conditions?.join(", ") || "None listed"],
              ["Allergies", registration.medicalInfo.allergies?.join(", ") || "None listed"],
            ]}
          />
          <SummaryCard
            icon={ShieldCheck}
            title="Consents"
            editTo="/register/consents"
            rows={[["Granted", `${Object.values(registration.consents).filter(Boolean).length} of ${Object.keys(registration.consents).length}`]]}
          />
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-tint-primary px-4 py-3 text-sm text-primary">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex-1" />
        <Button size="lg" fullWidth loading={submitting} icon={<Check size={18} />} className="mt-8 mb-6" onClick={submit}>
          Complete registration
        </Button>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  title,
  editTo,
  rows,
}: {
  icon: typeof User;
  title: string;
  editTo: string;
  rows: [string, string][];
}) {
  const navigate = useNavigate();
  return (
    <Card padding="md" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-tint-accent text-accent">
            <Icon size={15} />
          </div>
          <h3 className="font-display font-bold text-body text-[15px]">{title}</h3>
        </div>
        <button onClick={() => navigate(editTo)} className="flex items-center gap-1 text-xs font-semibold text-accent">
          <Pencil size={12} /> Edit
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 text-sm">
            <span className="text-faint">{label}</span>
            <span className="text-right font-medium text-body">{value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

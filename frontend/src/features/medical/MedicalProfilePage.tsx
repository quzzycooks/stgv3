import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Check, Droplet, IdCard } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TagInput } from "@/components/ui/TagInput";
import { usersApi } from "@/api/users";
import { extractErrorMessage } from "@/api/client";
import { BLOOD_TYPES } from "@/lib/nigerianStates";
import type { MedicalInfo } from "@/api/types";
import { cn } from "@/lib/cn";

export function MedicalProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ["me"], queryFn: usersApi.me });

  const [draft, setDraft] = useState<MedicalInfo>({});
  const [idCardOpen, setIdCardOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile?.medicalInfo) setDraft(profile.medicalInfo);
  }, [profile]);

  const save = useMutation({
    mutationFn: () => usersApi.updateMe({ medicalInfo: draft }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const primaryContact = profile?.emergencyContacts?.[0];
  const qrPayload = JSON.stringify({
    name: profile?.fullName,
    bloodType: draft.bloodType,
    allergies: draft.allergies,
    conditions: draft.conditions,
    medications: draft.medications,
    emergencyContact: primaryContact ? `${primaryContact.name} (${primaryContact.phoneNumber})` : undefined,
  });

  return (
    <AppShell>
      <div className="safe-top flex items-center justify-between px-6 pt-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-card-elevated text-body">
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-display text-lg font-extrabold text-body">Medical Profile</h1>
        </div>
        <button onClick={() => setIdCardOpen(true)} aria-label="View Medical ID card" className="grid h-10 w-10 place-items-center rounded-full bg-tint-accent text-accent">
          <IdCard size={18} />
        </button>
      </div>

      <div className="px-6 pt-6">
        <p className="text-sm text-muted">
          Only visible to a verified Skilled Responder while you're a participant in an open incident.
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
                  onClick={() => setDraft({ ...draft, bloodType: type })}
                  className={cn(
                    "rounded-2xl border py-3 text-sm font-bold transition-colors",
                    draft.bloodType === type ? "border-primary bg-tint-primary text-primary" : "border-subtle bg-card-elevated text-body",
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
            values={draft.conditions ?? []}
            onChange={(conditions) => setDraft({ ...draft, conditions })}
          />
          <TagInput
            label="Current medications"
            placeholder="e.g. Insulin"
            values={draft.medications ?? []}
            onChange={(medications) => setDraft({ ...draft, medications })}
          />
          <TagInput
            label="Allergies"
            placeholder="e.g. Penicillin"
            values={draft.allergies ?? []}
            onChange={(allergies) => setDraft({ ...draft, allergies })}
          />
        </div>

        <Button
          size="lg"
          fullWidth
          className="mt-8 mb-10"
          loading={save.isPending}
          icon={saved ? <Check size={18} /> : undefined}
          onClick={() => save.mutate()}
        >
          {saved ? "Saved" : "Save changes"}
        </Button>
        {save.isError && <p className="mt-2 text-xs font-medium text-primary">{extractErrorMessage(save.error)}</p>}
      </div>

      <Sheet open={idCardOpen} onClose={() => setIdCardOpen(false)} title="Medical ID Card">
        <div className="flex flex-col items-center gap-4">
          <Card className="w-full bg-primary !border-none" padding="lg">
            <div className="flex items-center justify-between text-white">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Stignit Medical ID</p>
                <p className="mt-1 font-display text-xl font-extrabold">{profile?.fullName}</p>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 font-display text-lg font-extrabold">
                {draft.bloodType ?? "—"}
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-1 text-sm text-white/85">
              <p>Allergies: {draft.allergies?.join(", ") || "None listed"}</p>
              <p>Conditions: {draft.conditions?.join(", ") || "None listed"}</p>
              {primaryContact && (
                <p>
                  Emergency contact: {primaryContact.name} · {primaryContact.phoneNumber}
                </p>
              )}
            </div>
          </Card>
          <div className="rounded-3xl border border-subtle bg-white p-4">
            <QRCodeSVG value={qrPayload} size={168} />
          </div>
          <p className="text-center text-xs text-faint">Generated on this device from your saved profile — not stored on any server.</p>
        </div>
      </Sheet>
    </AppShell>
  );
}

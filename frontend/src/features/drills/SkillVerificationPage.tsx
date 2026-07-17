import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, Clock, FileWarning, ShieldQuestion, UploadCloud } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { usersApi } from "@/api/users";
import { extractErrorMessage } from "@/api/client";
import { ProfessionalSkill, PROFESSIONAL_SKILL_LABEL, type ProfessionalSkill as TProfessionalSkill } from "@/lib/enums";
import { cn } from "@/lib/cn";

const STATUS_META = {
  NONE: { tone: "neutral" as const, icon: ShieldQuestion, label: "Not submitted" },
  PENDING: { tone: "warning" as const, icon: Clock, label: "Under review (up to 72h)" },
  APPROVED: { tone: "success" as const, icon: BadgeCheck, label: "Verified" },
  REJECTED: { tone: "primary" as const, icon: FileWarning, label: "Rejected — resubmit below" },
};

export function SkillVerificationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ["me"], queryFn: usersApi.me });

  const [skill, setSkill] = useState<TProfessionalSkill | null>(null);
  const [documentUrl, setDocumentUrl] = useState("");

  const submit = useMutation({
    mutationFn: () => usersApi.submitSkill({ skill: skill!, documentUrl }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });

  const status = profile?.skillVerificationStatus ?? "NONE";
  const meta = STATUS_META[status];

  return (
    <AppShell>
      <div className="safe-top flex items-center gap-3 px-6 pt-5">
        <button onClick={() => navigate(-1)} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-card-elevated text-body">
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-display text-lg font-extrabold text-body">Skill Verification</h1>
      </div>

      <div className="px-6 pt-6">
        <Card className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-tint-accent text-accent">
            <meta.icon size={19} />
          </div>
          <div>
            <Badge tone={meta.tone}>{meta.label}</Badge>
            {profile?.professionalSkill && (
              <p className="mt-1.5 text-sm font-semibold text-body">{PROFESSIONAL_SKILL_LABEL[profile.professionalSkill]}</p>
            )}
          </div>
        </Card>

        <p className="mt-6 text-sm text-muted">
          Verified professionals unlock Skilled Responder status — access to medical information during incidents
          and priority in the Breakout Room.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <label className="text-sm font-medium text-muted px-0.5">Your credential</label>
          <div className="grid grid-cols-2 gap-2">
            {ProfessionalSkill.map((s) => (
              <button
                key={s}
                onClick={() => setSkill(s)}
                className={cn(
                  "rounded-2xl border p-3 text-left text-sm font-semibold transition-colors",
                  skill === s ? "border-primary bg-tint-primary text-primary" : "border-subtle bg-card-elevated text-body",
                )}
              >
                {PROFESSIONAL_SKILL_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <Input
            label="Credential document link"
            placeholder="https://…"
            icon={<UploadCloud size={16} />}
            value={documentUrl}
            onChange={(e) => setDocumentUrl(e.target.value)}
            hint="Paste a link to your license or certificate (e.g. a cloud storage share link)."
          />
        </div>

        {submit.isError && <p className="mt-3 text-xs font-medium text-primary">{extractErrorMessage(submit.error)}</p>}

        <Button
          size="lg"
          fullWidth
          className="mt-6 mb-10"
          disabled={!skill || !documentUrl.trim()}
          loading={submit.isPending}
          onClick={() => submit.mutate()}
        >
          Submit for review
        </Button>
      </div>
    </AppShell>
  );
}

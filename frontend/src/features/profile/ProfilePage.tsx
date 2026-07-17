import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Camera, ChevronRight, LogOut, Settings, ShieldCheck, User, Pencil } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Sheet } from "@/components/ui/Sheet";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { usersApi } from "@/api/users";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { useIncidentHistoryStore } from "@/stores/incidentHistoryStore";
import { ACCESS_LEVEL_LABEL, PROFESSIONAL_SKILL_LABEL } from "@/lib/enums";
import { formatNigerianPhone } from "@/lib/schemas/auth";
import { resizeImageToDataUrl } from "@/lib/resizeImage";

export function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const clearSession = useAuthStore((s) => s.clear);
  const incidentIds = useIncidentHistoryStore((s) => s.incidentIds);

  const { data: profile } = useQuery({ queryKey: ["me"], queryFn: usersApi.me });
  const [editOpen, setEditOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [stateLga, setStateLga] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  const openEdit = () => {
    setFullName(profile?.fullName ?? "");
    setStateLga(profile?.stateLga ?? "");
    setEditOpen(true);
  };

  const saveProfile = useMutation({
    mutationFn: () => usersApi.updateMe({ fullName, stateLga }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setEditOpen(false);
    },
  });

  const savePhoto = useMutation({
    mutationFn: (profilePhotoUrl: string) => usersApi.updateMe({ profilePhotoUrl }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImageToDataUrl(file);
    savePhoto.mutate(dataUrl);
    e.target.value = "";
  };

  const signOut = async () => {
    if (session) authApi.logout(session.refreshToken).catch(() => {});
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <AppShell>
      <div className="safe-top flex items-center justify-between px-6 pt-5">
        <h1 className="font-display text-lg font-extrabold text-body">Profile</h1>
        <button onClick={() => navigate("/settings")} aria-label="Open settings" className="grid h-10 w-10 place-items-center rounded-full bg-card-elevated text-body">
          <Settings size={18} />
        </button>
      </div>

      <div className="px-6 pt-6">
        <Card className="flex items-center gap-4">
          <button onClick={() => photoInputRef.current?.click()} aria-label="Change profile photo" className="relative shrink-0">
            <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-tint-primary text-primary">
              {savePhoto.isPending ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              ) : profile?.profilePhotoUrl ? (
                <img src={profile.profilePhotoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <User size={26} />
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full bg-accent text-white border-2 border-card">
              <Camera size={12} />
            </span>
            {profile?.accountStatus === "ACTIVE" && (
              <span className="absolute -top-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-success text-white border-2 border-card">
                <BadgeCheck size={11} />
              </span>
            )}
          </button>
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-bold text-body">{profile?.fullName}</p>
            <p className="text-xs text-muted">{profile ? formatNigerianPhone(profile.phoneNumber) : ""}</p>
            <p className="text-xs text-faint">{profile?.stateLga}</p>
          </div>
          <button onClick={openEdit} aria-label="Edit profile" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-tint-accent text-accent">
            <Pencil size={14} />
          </button>
        </Card>

        <Card className="mt-4 flex items-center gap-4">
          <ProgressRing progress={(profile?.drillCompletionPct ?? 0) / 100} size={56} color="var(--color-success)">
            <ShieldCheck size={20} className="text-success" />
          </ProgressRing>
          <div>
            <Badge tone="success">{ACCESS_LEVEL_LABEL[profile?.accessLevel ?? "OBSERVER"]}</Badge>
            <p className="mt-1.5 text-xs text-muted">{Math.round(profile?.drillCompletionPct ?? 0)}% drill completion</p>
          </div>
        </Card>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatTile label="Incidents on this device" value={incidentIds.length} />
          <StatTile label="Professional skill" value={profile?.professionalSkill ? PROFESSIONAL_SKILL_LABEL[profile.professionalSkill] : "None"} />
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <Row label="Skill Verification" onClick={() => navigate("/skill-verification")} />
          <Row label="Emergency Contacts" onClick={() => navigate("/contacts")} />
          <Row label="Medical Profile" onClick={() => navigate("/medical")} />
          <Row label="Settings" onClick={() => navigate("/settings")} />
        </div>

        <button
          onClick={signOut}
          className="mt-6 mb-10 flex w-full items-center justify-center gap-2 rounded-2xl border border-subtle bg-card-elevated py-4 text-sm font-semibold text-primary"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>

      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit profile">
        <div className="flex flex-col gap-4">
          <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input label="State / LGA" value={stateLga} onChange={(e) => setStateLga(e.target.value)} />
          <Button fullWidth loading={saveProfile.isPending} onClick={() => saveProfile.mutate()}>
            Save changes
          </Button>
        </div>
      </Sheet>
    </AppShell>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card padding="sm">
      <p className="font-display text-lg font-extrabold text-body">{value}</p>
      <p className="mt-0.5 text-xs text-faint">{label}</p>
    </Card>
  );
}

function Row({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center justify-between rounded-2xl border border-subtle bg-card-elevated px-4 py-3.5">
      <span className="text-sm font-semibold text-body">{label}</span>
      <ChevronRight size={16} className="text-faint" />
    </button>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  Fingerprint,
  Globe,
  MapPin,
  Moon,
  ShieldAlert,
  Sun,
  Trash2,
  Monitor,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { usersApi } from "@/api/users";
import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import { useTheme } from "@/hooks/useTheme";
import {
  isPlatformAuthenticatorAvailable,
  registerQuickUnlock,
  clearQuickUnlockCredential,
} from "@/lib/webauthn";
import { cn } from "@/lib/cn";

export function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { preference, setPreference } = useTheme();
  const session = useAuthStore((s) => s.session);
  const clearSession = useAuthStore((s) => s.clear);
  const quickUnlockEnabled = useUiStore((s) => s.quickUnlockEnabled);
  const setQuickUnlockEnabled = useUiStore((s) => s.setQuickUnlockEnabled);

  const { data: profile } = useQuery({ queryKey: ["me"], queryFn: usersApi.me });
  const [delaySec, setDelaySec] = useState(120);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteScheduled, setDeleteScheduled] = useState<string | null>(null);
  const [locationPermission, setLocationPermission] = useState<string>("unknown");

  useEffect(() => {
    navigator.permissions?.query({ name: "geolocation" as PermissionName }).then((p) => setLocationPermission(p.state));
  }, []);

  const updateDelay = useMutation({
    mutationFn: (value: number) => usersApi.updateMe({ welfareCheckDelaySec: value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });

  const toggleQuickUnlock = async (enabled: boolean) => {
    if (enabled && session) {
      const available = await isPlatformAuthenticatorAvailable();
      if (!available) return;
      const ok = await registerQuickUnlock(session.userId, profile?.phoneNumber ?? session.userId);
      if (ok) setQuickUnlockEnabled(true);
    } else {
      clearQuickUnlockCredential();
      setQuickUnlockEnabled(false);
    }
  };

  const exportData = async () => {
    const data = await usersApi.exportMe();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stignit-data-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteAccount = useMutation({
    mutationFn: () => usersApi.deleteMe(),
    onSuccess: (result) => setDeleteScheduled(result.scheduledFor),
  });

  const finalizeDeleteAndSignOut = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <AppShell>
      <div className="safe-top flex items-center gap-3 px-6 pt-5">
        <button onClick={() => navigate(-1)} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-card-elevated text-body">
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-display text-lg font-extrabold text-body">Settings</h1>
      </div>

      <div className="px-6 pt-6 pb-10 flex flex-col gap-5">
        <SectionTitle>Appearance</SectionTitle>
        <Card padding="sm" className="flex gap-1">
          {(["light", "dark", "system"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setPreference(mode)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1.5 rounded-2xl py-3 text-xs font-semibold capitalize transition-colors",
                preference === mode ? "bg-primary text-white" : "text-muted",
              )}
            >
              {mode === "light" ? <Sun size={16} /> : mode === "dark" ? <Moon size={16} /> : <Monitor size={16} />}
              {mode}
            </button>
          ))}
        </Card>

        <SectionTitle>Security</SectionTitle>
        <Row icon={Fingerprint} label="Face ID / Fingerprint Quick Unlock" trailing={<Switch checked={quickUnlockEnabled} onChange={toggleQuickUnlock} />} />
        <Row icon={MapPin} label={`Location access: ${locationPermission}`} description="Managed in your browser or device settings" />
        <Row icon={Globe} label="Language" description="English (Nigeria)" />

        <SectionTitle>Crash Sensitivity</SectionTitle>
        <Card padding="md">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-body">Welfare check delay</p>
            <span className="font-display text-sm font-bold text-primary">{delaySec}s</span>
          </div>
          <p className="mt-1 text-xs text-muted">How long Stignit waits for you to confirm you're safe before escalating.</p>
          <input
            type="range"
            min={30}
            max={600}
            step={10}
            defaultValue={profile?.welfareCheckDelaySec ?? 120}
            onChange={(e) => setDelaySec(Number(e.target.value))}
            onMouseUp={() => updateDelay.mutate(delaySec)}
            onTouchEnd={() => updateDelay.mutate(delaySec)}
            className="mt-3 w-full accent-primary"
          />
        </Card>

        <SectionTitle>Data & Privacy</SectionTitle>
        <Row icon={Download} label="Export my data" onClick={exportData} description="Includes your consent history (NDPA)" />
        <button
          onClick={() => setDeleteOpen(true)}
          className="flex items-center gap-3 rounded-2xl border border-subtle bg-card-elevated px-4 py-3.5 text-left"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-tint-primary text-primary">
            <Trash2 size={15} />
          </div>
          <span className="text-sm font-semibold text-primary">Delete my account</span>
        </button>
      </div>

      <Sheet open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete account">
        {!deleteScheduled ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-3xl bg-tint-primary text-primary">
              <ShieldAlert size={26} />
            </div>
            <p className="text-sm text-muted">
              Your account and personal data will be permanently deleted after a 30-day grace period. This can't be
              undone once complete.
            </p>
            <Button fullWidth variant="danger" loading={deleteAccount.isPending} onClick={() => deleteAccount.mutate()}>
              Confirm deletion
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-muted">
              Scheduled for deletion on <span className="font-semibold text-body">{new Date(deleteScheduled).toLocaleDateString()}</span>.
            </p>
            <Button fullWidth onClick={finalizeDeleteAndSignOut}>
              Sign out
            </Button>
          </div>
        )}
      </Sheet>
    </AppShell>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-bold uppercase tracking-wide text-faint px-0.5 -mb-2">{children}</h2>;
}

function Row({
  icon: Icon,
  label,
  description,
  trailing,
  onClick,
}: {
  icon: typeof MapPin;
  label: string;
  description?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp onClick={onClick} className="flex items-center gap-3 rounded-2xl border border-subtle bg-card-elevated px-4 py-3.5 text-left">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-tint-accent text-accent">
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-body">{label}</p>
        {description && <p className="text-xs text-faint">{description}</p>}
      </div>
      {trailing}
    </Comp>
  );
}

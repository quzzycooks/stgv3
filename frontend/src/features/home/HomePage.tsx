import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bell,
  Users,
  ShieldCheck,
  HeartPulse,
  Wrench,
  ChevronRight,
  Radar,
  Siren,
  Navigation,
  Play,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { MapPreview } from "@/components/ui/MapPreview";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { usersApi } from "@/api/users";
import { incidentsApi } from "@/api/incidents";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useIncidentHistoryStore } from "@/stores/incidentHistoryStore";
import { ACCESS_LEVEL_LABEL, INCIDENT_TYPE_LABEL } from "@/lib/enums";
import { cn } from "@/lib/cn";

const QUICK_ACTIONS = [
  { label: "Emergency\nContacts", to: "/contacts", icon: Users, tone: "primary" as const },
  { label: "Training &\nDrills", to: "/drills", icon: ShieldCheck, tone: "accent" as const },
  { label: "Medical\nProfile", to: "/medical", icon: HeartPulse, tone: "success" as const },
  { label: "Safety\nSettings", to: "/settings", icon: Wrench, tone: "warning" as const },
];

const toneClasses = {
  primary: "bg-tint-primary text-primary",
  accent: "bg-tint-accent text-accent",
  success: "bg-tint-success text-success",
  warning: "bg-tint-warning text-warning",
};

const SAFETY_TIPS = [
  { title: "Know your blood type", body: "Add it to your Medical Profile so responders can act fast." },
  { title: "Test your contacts", body: "Make sure your emergency contacts have working numbers." },
  { title: "Practice a scenario", body: "5-minute drills raise your responder tier and readiness." },
];

export function HomePage() {
  const navigate = useNavigate();
  const { gps, error: gpsError, loading: gpsLoading, retry: retryGps } = useGeolocation(true);
  const incidentIds = useIncidentHistoryStore((s) => s.incidentIds);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);

  const { data: profile } = useQuery({ queryKey: ["me"], queryFn: usersApi.me });

  const { data: recentIncidents } = useQuery({
    queryKey: ["recent-incidents", incidentIds],
    queryFn: () => Promise.all(incidentIds.slice(0, 3).map((id) => incidentsApi.get(id))),
    enabled: incidentIds.length > 0,
  });

  const firstName = profile?.fullName?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <AppShell>
      <div className="safe-top px-6 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">{greeting},</p>
            <h1 className="font-display text-2xl font-extrabold text-body">{firstName}</h1>
          </div>
          <button
            onClick={() => navigate("/notifications")}
            className="grid h-11 w-11 place-items-center rounded-full bg-card-elevated text-body border border-subtle"
          >
            <Bell size={19} />
          </button>
        </div>

        {/* AI Protection status */}
        <Card variant="elevated" className="mt-5 flex items-center gap-4">
          <ProgressRing progress={(profile?.drillCompletionPct ?? 0) / 100} size={60} color="var(--color-success)">
            <Radar size={22} className="text-success" />
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-display font-bold text-body">AI Protection Active</p>
              <span className="h-2 w-2 rounded-full bg-success animate-pulse-ring relative" />
            </div>
            <p className="mt-0.5 text-xs text-muted">
              Anomaly detection running · Welfare check in {profile?.welfareCheckDelaySec ?? 120}s if triggered
            </p>
            <div className="mt-2">
              <Badge tone="success">{ACCESS_LEVEL_LABEL[profile?.accessLevel ?? "OBSERVER"]}</Badge>
            </div>
          </div>
        </Card>

        {/* Demo entry point — simulates a crash through the real detection pipeline,
            no waiting required: Welfare Check's "I Need Help Now" skips the countdown
            straight into a real Situation Room / Breakout Room. */}
        <button
          onClick={() => navigate("/detection-demo")}
          className="mt-5 flex w-full items-center gap-4 rounded-3xl border-2 border-dashed border-[var(--border-strong)] bg-tint-primary p-4 text-left"
        >
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-white">
            <Play size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold text-body">Try the Live Demo</p>
            <p className="text-xs text-muted">See the full response flow — no real crash needed</p>
          </div>
          <ChevronRight size={18} className="shrink-0 text-faint" />
        </button>

        {/* Quick actions */}
        <div className="mt-5 grid grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <motion.button
              key={action.to}
              whileTap={{ scale: 0.94 }}
              onClick={() => navigate(action.to)}
              className="flex flex-col items-center gap-2"
            >
              <div className={cn("grid h-14 w-14 place-items-center rounded-2xl", toneClasses[action.tone])}>
                <action.icon size={22} />
              </div>
              <span className="whitespace-pre-line text-center text-[11px] font-semibold leading-tight text-body">
                {action.label}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Map preview */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setLocationSheetOpen(true)}
          onKeyDown={(e) => e.key === "Enter" && setLocationSheetOpen(true)}
          aria-label="View my current location"
          className="mt-6 block w-full cursor-pointer text-left"
        >
          <MapPreview
            lat={gps?.lat}
            lng={gps?.lng}
            locationError={gpsError}
            locationLoading={gpsLoading}
            onRetryLocation={(e) => {
              e?.stopPropagation();
              retryGps();
            }}
            className="h-40 w-full"
          />
          {gps?.accuracyMeters !== undefined && (
            <p className="mt-1.5 px-1 text-[11px] text-faint">
              Accurate to ~{Math.round(gps.accuracyMeters)}m
              {gps.accuracyMeters > 500 && " — your device has no GPS, so this is an approximate network location"}
            </p>
          )}
        </div>

        {/* Recent incidents (device-local) */}
        {recentIncidents && recentIncidents.length > 0 && (
          <div className="mt-7">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-body">Recent on this device</h2>
            </div>
            <div className="mt-3 flex flex-col gap-2.5">
              {recentIncidents.map((incident) => (
                <button
                  key={incident.incidentId}
                  onClick={() => navigate(`/incidents/${incident.incidentId}`)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-subtle bg-card-elevated p-3.5 text-left"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tint-primary text-primary">
                    <ShieldCheck size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-body">{INCIDENT_TYPE_LABEL[incident.incidentType]}</p>
                    <p className="text-xs text-faint">{new Date(incident.createdAt).toLocaleString()}</p>
                  </div>
                  <Badge tone={incident.status === "CLOSED" ? "neutral" : "primary"}>{incident.status}</Badge>
                  <ChevronRight size={16} className="text-faint" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Safety carousel */}
        <div className="mt-7">
          <h2 className="font-display font-bold text-body">Safety & Readiness</h2>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 snap-x">
            {SAFETY_TIPS.map((tip) => (
              <Card key={tip.title} variant="flat" className="min-w-[220px] snap-start bg-tint-accent border-none">
                <p className="font-display text-sm font-bold text-body">{tip.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{tip.body}</p>
              </Card>
            ))}
            <button
              onClick={() => navigate("/drills")}
              className="flex min-w-[160px] snap-start flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-[var(--border-strong)] text-accent"
            >
              <ShieldCheck size={22} />
              <span className="text-xs font-semibold">Start a drill</span>
            </button>
          </div>
        </div>
      </div>

      <Sheet open={locationSheetOpen} onClose={() => setLocationSheetOpen(false)} title="My Location">
        <MapPreview
          lat={gps?.lat}
          lng={gps?.lng}
          locationError={gpsError}
          locationLoading={gpsLoading}
          onRetryLocation={() => retryGps()}
          interactive
          className="h-[45vh] w-full"
        />

        <div className="mt-4 flex items-center gap-2 text-sm">
          <Navigation size={15} className="shrink-0 text-accent" />
          {gps ? (
            <span className="text-muted">
              {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
              {gps.accuracyMeters !== undefined && <> · accurate to ~{Math.round(gps.accuracyMeters)}m</>}
            </span>
          ) : (
            <span className="text-faint">Locating you…</span>
          )}
        </div>

        <Button
          fullWidth
          size="lg"
          className="mt-5"
          icon={<Siren size={18} />}
          onClick={() => {
            setLocationSheetOpen(false);
            navigate("/sos");
          }}
        >
          Report Emergency From Here
        </Button>
      </Sheet>
    </AppShell>
  );
}

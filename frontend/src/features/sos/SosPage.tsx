import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertTriangle, Building2, Car, Eye, Flame, HeartPulse, UserRound, Users, Waves, X, MapPin } from "lucide-react";
import { SwipeToConfirm } from "@/components/ui/SwipeToConfirm";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { usersApi } from "@/api/users";
import { incidentsApi } from "@/api/incidents";
import { extractErrorMessage } from "@/api/client";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useIncidentHistoryStore } from "@/stores/incidentHistoryStore";
import { INCIDENT_TYPE_LABEL, type IncidentType, type ReporterRole } from "@/lib/enums";
import { cn } from "@/lib/cn";

const REPORTER_ROLE_OPTIONS: { value: ReporterRole; label: string; hint: string; icon: typeof Eye }[] = [
  { value: "INVOLVED", label: "I'm involved", hint: "This is happening to me", icon: UserRound },
  { value: "WITNESS", label: "I'm an observer", hint: "I'm reporting what I see", icon: Eye },
];

const TYPE_ICONS: Record<IncidentType, typeof Car> = {
  RTA: Car,
  MEDICAL_COLLAPSE: HeartPulse,
  FIRE: Flame,
  DROWNING: Waves,
  BUILDING_COLLAPSE: Building2,
  CROWD_CRUSH: Users,
  UNKNOWN: AlertTriangle,
};

const TYPES: IncidentType[] = ["RTA", "MEDICAL_COLLAPSE", "FIRE", "DROWNING", "BUILDING_COLLAPSE", "CROWD_CRUSH", "UNKNOWN"];
const COUNTDOWN_SECONDS = 5;

type Stage = "select" | "confirm" | "counting" | "creating" | "error";

export function SosPage() {
  const navigate = useNavigate();
  const { gps, error: gpsError } = useGeolocation();
  const addIncident = useIncidentHistoryStore((s) => s.addIncident);

  const [stage, setStage] = useState<Stage>("select");
  const [selectedType, setSelectedType] = useState<IncidentType | null>(null);
  const [reporterRole, setReporterRole] = useState<ReporterRole>("INVOLVED");
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);
  const [error, setError] = useState<string | null>(null);

  const { data: contacts } = useQuery({ queryKey: ["emergency-contacts"], queryFn: usersApi.listEmergencyContacts });

  useEffect(() => {
    if (stage !== "counting") return;
    if (remaining <= 0) {
      void createIncident();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, remaining]);

  const createIncident = async () => {
    if (!selectedType || !gps) {
      setError("Waiting for a GPS fix — please stay still for a moment.");
      setStage("error");
      return;
    }
    setStage("creating");
    try {
      const result = await incidentsApi.trigger({
        incidentType: selectedType,
        gps,
        occurredAt: new Date().toISOString(),
        reporterRole,
      });
      addIncident(result.incidentId);
      navigate(`/incidents/${result.incidentId}`, { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err, "Couldn't create the Situation Room. Please try again."));
      setStage("error");
    }
  };

  const cancelCountdown = () => {
    setRemaining(COUNTDOWN_SECONDS);
    setStage("confirm");
  };

  return (
    <div className="app-shell flex min-h-dvh flex-col bg-canvas safe-top safe-bottom">
      <div className="flex items-center justify-between px-6 pt-5">
        <div>
          <h1 className="font-display text-xl font-extrabold text-body">Report an Emergency</h1>
          <p className="text-xs text-muted">A Situation Room opens the moment you confirm</p>
        </div>
        <button onClick={() => navigate(-1)} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full bg-card-elevated text-body">
          <X size={18} />
        </button>
      </div>

      {stage === "select" && (
        <div className="flex-1 px-6 pt-6">
          <div className="grid grid-cols-2 gap-3">
            {TYPES.map((type) => {
              const Icon = TYPE_ICONS[type];
              return (
                <motion.button
                  key={type}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    setSelectedType(type);
                    setStage("confirm");
                  }}
                  className="flex flex-col items-center gap-2.5 rounded-3xl border border-subtle bg-card-elevated p-5 shadow-card"
                >
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-tint-primary text-primary">
                    <Icon size={22} />
                  </div>
                  <span className="text-center text-sm font-semibold text-body">{INCIDENT_TYPE_LABEL[type]}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {stage === "confirm" && selectedType && (
        <div className="flex flex-1 flex-col px-6 pt-6">
          <div className="flex flex-col items-center text-center">
            <div className="grid h-20 w-20 place-items-center rounded-4xl bg-tint-primary text-primary">
              {(() => {
                const Icon = TYPE_ICONS[selectedType];
                return <Icon size={32} />;
              })()}
            </div>
            <h2 className="mt-4 font-display text-xl font-bold text-body">{INCIDENT_TYPE_LABEL[selectedType]}</h2>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
              <MapPin size={14} />
              {gps ? `Location accurate to ${Math.round(gps.accuracyMeters ?? 0)}m` : gpsError ?? "Locating you…"}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2">
            {REPORTER_ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setReporterRole(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3.5 text-center transition-colors",
                  reporterRole === opt.value
                    ? "border-primary bg-tint-primary text-primary"
                    : "border-subtle bg-card-elevated text-muted",
                )}
              >
                <opt.icon size={18} />
                <span className="text-xs font-bold">{opt.label}</span>
                <span className="text-[10px] leading-tight text-faint">{opt.hint}</span>
              </button>
            ))}
          </div>

          {reporterRole === "INVOLVED" && contacts && contacts.length > 0 && (
            <div className="mt-4 rounded-2xl border border-subtle bg-card-elevated p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-faint">Will be notified</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {contacts.map((c) => (
                  <span key={c.id} className="rounded-full bg-tint-accent px-3 py-1 text-xs font-semibold text-accent">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {reporterRole === "WITNESS" && (
            <p className="mt-4 text-center text-xs text-faint">
              Your emergency contacts won't be notified — a Situation Room still opens to coordinate help.
            </p>
          )}

          <div className="flex-1" />
          <div className="mb-6 flex flex-col gap-3">
            <SwipeToConfirm label="Slide to confirm" onConfirm={() => setStage("counting")} />
            <button onClick={() => setStage("select")} className="text-center text-sm font-semibold text-muted">
              Choose a different type
            </button>
          </div>
        </div>
      )}

      {(stage === "counting" || stage === "creating") && selectedType && (
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <ProgressRing progress={1 - remaining / COUNTDOWN_SECONDS} size={180} strokeWidth={10} color="var(--color-primary)">
            <div className="flex flex-col items-center">
              <span className="font-display text-5xl font-extrabold text-primary">{stage === "creating" ? "" : remaining}</span>
              <span className="text-xs font-semibold text-muted">{stage === "creating" ? "Opening room…" : "seconds"}</span>
            </div>
          </ProgressRing>
          <p className="mt-6 text-center text-sm text-muted">
            Opening a Situation Room for <span className="font-semibold text-body">{INCIDENT_TYPE_LABEL[selectedType]}</span>
          </p>
          {stage === "counting" && (
            <button
              onClick={cancelCountdown}
              className="mt-8 rounded-full border-2 border-[var(--border-strong)] px-8 py-3.5 text-sm font-bold text-body"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {stage === "error" && (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className={cn("grid h-16 w-16 place-items-center rounded-3xl bg-tint-primary text-primary")}>
            <AlertTriangle size={28} />
          </div>
          <p className="mt-4 text-sm text-muted">{error}</p>
          <button
            onClick={() => setStage("confirm")}
            className="mt-6 rounded-full bg-primary px-8 py-3.5 text-sm font-bold text-white"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

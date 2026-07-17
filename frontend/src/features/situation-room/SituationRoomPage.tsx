import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Users,
  MessageSquare,
  History,
  Ambulance,
  Building2,
  Phone,
  MapPin,
  CheckCircle2,
  ChevronRight,
  HeartPulse,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { MapPreview } from "@/components/ui/MapPreview";
import { incidentsApi } from "@/api/incidents";
import { transportApi } from "@/api/transport";
import { usersApi } from "@/api/users";
import { extractErrorMessage } from "@/api/client";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useIncidentSocket } from "@/hooks/useSocket";
import { INCIDENT_TYPE_LABEL, IncidentStatus, type IncidentStatus as TIncidentStatus } from "@/lib/enums";
import { cn } from "@/lib/cn";

const STATUS_FLOW: TIncidentStatus[] = ["ACTIVE", "UNDER_CONTROL", "TRANSFERRED", "CLOSED"];

export function SituationRoomPage() {
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { gps } = useGeolocation(true);
  const [onScene, setOnScene] = useState<boolean | null>(null);
  const [statusSheetOpen, setStatusSheetOpen] = useState(false);
  const [cardiac, setCardiac] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: incident } = useQuery({
    queryKey: ["incident", incidentId],
    queryFn: () => incidentsApi.get(incidentId!),
    enabled: Boolean(incidentId),
    refetchInterval: 15_000,
  });

  const { data: summary } = useQuery({
    queryKey: ["incident-summary", incidentId],
    queryFn: () => incidentsApi.summary(incidentId!),
    enabled: Boolean(incidentId),
    refetchInterval: 15_000,
  });

  const { data: transport } = useQuery({
    queryKey: ["transport", incidentId],
    queryFn: () => transportApi.status(incidentId!),
    enabled: Boolean(incidentId),
    refetchInterval: 10_000,
  });

  const { data: profile } = useQuery({ queryKey: ["me"], queryFn: usersApi.me });

  const { data: hospital } = useQuery({
    queryKey: ["hospital-recommendation", incidentId, gps?.lat, gps?.lng, cardiac],
    queryFn: () => transportApi.hospitalRecommendation(incidentId!, gps!.lat, gps!.lng, cardiac),
    enabled: Boolean(incidentId && gps),
  });

  useIncidentSocket(incidentId ?? null, (event) => {
    if (event === "incident:update") queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
    if (event === "transport:update") queryClient.invalidateQueries({ queryKey: ["transport", incidentId] });
  });

  // Keep sending live location while this room is open, so responders and proximity matching stay accurate.
  useEffect(() => {
    if (!gps || !incidentId) return;
    incidentsApi.updateLocation(gps).catch(() => {});
  }, [gps, incidentId]);

  const confirmProximity = useMutation({
    mutationFn: (present: boolean) => incidentsApi.confirmProximity(incidentId!, present),
    onSuccess: (_, present) => setOnScene(present),
  });

  const dispatchTransport = useMutation({
    mutationFn: () => transportApi.dispatch(incidentId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transport", incidentId] }),
    onError: (err) => setActionError(extractErrorMessage(err, "Couldn't request transport.")),
  });

  const transitionStatus = useMutation({
    mutationFn: (to: TIncidentStatus) => incidentsApi.transitionStatus(incidentId!, to),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
      setStatusSheetOpen(false);
    },
    onError: (err) => setActionError(extractErrorMessage(err, "Couldn't update the status.")),
  });

  if (!incident) {
    return (
      <AppShell showNav={false} showSos={false}>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--border-subtle)] border-t-primary" />
        </div>
      </AppShell>
    );
  }

  const lat = parseFloat(incident.gpsLat);
  const lng = parseFloat(incident.gpsLng);
  const canDispatchTransport = profile && ["TIER1", "TIER2", "SKILLED"].includes(profile.accessLevel);
  const currentStatusIndex = STATUS_FLOW.indexOf(incident.status);

  return (
    <AppShell showNav={false} showSos={false}>
      <div className="safe-top flex items-center justify-between px-6 pt-5">
        <button onClick={() => navigate("/home")} aria-label="Back to home" className="grid h-10 w-10 place-items-center rounded-full bg-card-elevated text-body">
          <ArrowLeft size={18} />
        </button>
        <button onClick={() => setStatusSheetOpen(true)}>
          <Badge tone={incident.status === "CLOSED" || incident.status === "FALSE_ALARM" ? "neutral" : "primary"} dot>
            {incident.status.replace("_", " ")}
          </Badge>
        </button>
      </div>

      <div className="px-6 pt-4">
        <h1 className="font-display text-2xl font-extrabold text-body">{INCIDENT_TYPE_LABEL[incident.incidentType]}</h1>
        <p className="mt-1 text-xs text-faint">
          Opened {new Date(incident.createdAt).toLocaleTimeString()} · #{incident.incidentId.slice(-8)}
        </p>

        {/* Status stepper */}
        {currentStatusIndex >= 0 && (
          <div className="mt-4 flex items-center gap-1.5">
            {STATUS_FLOW.map((s, i) => (
              <div key={s} className={cn("h-1.5 flex-1 rounded-full", i <= currentStatusIndex ? "bg-primary" : "bg-[var(--border-subtle)]")} />
            ))}
          </div>
        )}

        <MapPreview lat={lat} lng={lng} className="mt-5 h-44 w-full" />

        {/* Responder aggregate */}
        <Card className="mt-4 flex items-center justify-around text-center" padding="sm">
          <Stat icon={Users} label="Participants" value={summary?.responderAggregate.participants ?? 0} />
          <div className="h-8 w-px bg-[var(--border-subtle)]" />
          <Stat icon={CheckCircle2} label="Confirmed" value={summary?.responderAggregate.confirmed ?? 0} tone="text-success" />
          <div className="h-8 w-px bg-[var(--border-subtle)]" />
          <Stat icon={MapPin} label="Silent" value={summary?.responderAggregate.silent ?? 0} tone="text-warning" />
        </Card>

        {/* Proximity confirmation */}
        <div className="mt-4 flex gap-2">
          <Button
            fullWidth
            variant={onScene === true ? "success" : "outline"}
            size="sm"
            onClick={() => confirmProximity.mutate(true)}
            loading={confirmProximity.isPending && confirmProximity.variables === true}
          >
            I'm on scene
          </Button>
          <Button
            fullWidth
            variant={onScene === false ? "danger" : "outline"}
            size="sm"
            onClick={() => confirmProximity.mutate(false)}
            loading={confirmProximity.isPending && confirmProximity.variables === false}
          >
            Not on scene
          </Button>
        </div>

        {/* Transport */}
        <Card className="mt-5" padding="md">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-tint-accent text-accent">
              <Ambulance size={17} />
            </div>
            <h3 className="font-display font-bold text-body">Transport</h3>
          </div>

          {transport?.status ? (
            <div className="mt-3 flex items-center justify-between">
              <Badge tone="accent">{transport.status.replace("_", " ")}</Badge>
              {transport.etaMinutes != null && <span className="text-sm font-semibold text-body">ETA {transport.etaMinutes} min</span>}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">No transport dispatched yet.</p>
          )}

          {canDispatchTransport && !transport?.status && (
            <Button size="sm" className="mt-3" fullWidth loading={dispatchTransport.isPending} onClick={() => dispatchTransport.mutate()}>
              Request Transport
            </Button>
          )}
        </Card>

        {/* Hospital recommendation */}
        <Card className="mt-3" padding="md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-tint-success text-success">
                <Building2 size={17} />
              </div>
              <h3 className="font-display font-bold text-body">Recommended Hospital</h3>
            </div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              <input type="checkbox" checked={cardiac} onChange={(e) => setCardiac(e.target.checked)} className="accent-primary" />
              Cardiac case
            </label>
          </div>

          {hospital ? (
            <div className="mt-3">
              <p className="font-semibold text-body">{hospital.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                <Badge tone="success">Trauma L{hospital.traumaLevel}</Badge>
                {hospital.hasCathLab && <Badge tone="accent">Cath Lab</Badge>}
                {hospital.distanceKm != null && <span>{hospital.distanceKm.toFixed(1)} km away</span>}
              </div>
              <a href={`tel:${hospital.contactPhone}`}>
                <Button size="sm" fullWidth className="mt-3" icon={<Phone size={14} />}>
                  Call {hospital.name}
                </Button>
              </a>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">Recommendation appears once transport is underway.</p>
          )}
        </Card>

        {actionError && <p className="mt-3 text-xs font-medium text-primary">{actionError}</p>}

        {/* Navigation to breakout / summary */}
        <div className="mt-5 flex flex-col gap-2.5 pb-8">
          <NavRow icon={MessageSquare} label="Breakout Coordination Room" onClick={() => navigate(`/incidents/${incidentId}/breakout`)} />
          <NavRow icon={History} label="Incident Timeline (Incident DNA)" onClick={() => navigate(`/incidents/${incidentId}/summary`)} />
          <NavRow icon={HeartPulse} label="My Medical Profile" onClick={() => navigate("/medical")} />
        </div>
      </div>

      <Sheet open={statusSheetOpen} onClose={() => setStatusSheetOpen(false)} title="Update status">
        <div className="flex flex-col gap-2">
          {IncidentStatus.filter((s) => s !== incident.status).map((s) => (
            <button
              key={s}
              onClick={() => transitionStatus.mutate(s)}
              className="flex items-center justify-between rounded-2xl border border-subtle bg-card-elevated px-4 py-3.5 text-left"
            >
              <span className="font-semibold text-body">{s.replace("_", " ")}</span>
              <ChevronRight size={16} className="text-faint" />
            </button>
          ))}
        </div>
      </Sheet>
    </AppShell>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Icon size={16} className={tone ?? "text-muted"} />
      <span className="font-display text-lg font-extrabold text-body">{value}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-faint">{label}</span>
    </div>
  );
}

function NavRow({ icon: Icon, label, onClick }: { icon: typeof Users; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 rounded-2xl border border-subtle bg-card-elevated px-4 py-4">
      <div className="grid h-9 w-9 place-items-center rounded-full bg-tint-accent text-accent">
        <Icon size={16} />
      </div>
      <span className="flex-1 text-left font-semibold text-body text-sm">{label}</span>
      <ChevronRight size={16} className="text-faint" />
    </button>
  );
}

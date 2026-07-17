import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { incidentsApi } from "@/api/incidents";
import { INCIDENT_TYPE_LABEL } from "@/lib/enums";
import { ACTION_TYPE_ICON, ACTION_TYPE_LABEL } from "@/lib/actionMeta";

export function IncidentSummaryPage() {
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();

  const { data: summary } = useQuery({
    queryKey: ["incident-summary", incidentId],
    queryFn: () => incidentsApi.summary(incidentId!),
    enabled: Boolean(incidentId),
  });

  return (
    <AppShell showNav={false} showSos={false}>
      <div className="safe-top flex items-center gap-3 px-6 pt-5">
        <button onClick={() => navigate(-1)} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-card-elevated text-body">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-display text-lg font-extrabold text-body">Incident DNA</h1>
          <p className="text-xs text-faint">Full record of this Situation Room</p>
        </div>
      </div>

      {summary && (
        <div className="px-6 pt-5 pb-10">
          <Card padding="md">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-body">{INCIDENT_TYPE_LABEL[summary.incidentType]}</h2>
              <span className="text-xs font-semibold text-muted">{summary.status.replace("_", " ")}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <MetaStat label="Opened" value={new Date(summary.createdAt).toLocaleTimeString()} />
              <MetaStat label="Occurred" value={new Date(summary.occurredAt).toLocaleTimeString()} />
              <MetaStat label="Closed" value={summary.closedAt ? new Date(summary.closedAt).toLocaleTimeString() : "—"} />
            </div>
          </Card>

          <Card className="mt-3 flex justify-around" padding="sm">
            <MetaStat label="Participants" value={String(summary.responderAggregate.participants)} large />
            <MetaStat label="Confirmed" value={String(summary.responderAggregate.confirmed)} large />
            <MetaStat label="Silent" value={String(summary.responderAggregate.silent)} large />
          </Card>

          <h3 className="mt-6 font-display font-bold text-body">Timeline</h3>
          <div className="mt-3 flex flex-col">
            {summary.timeline.map((entry, i) => {
              const Icon = ACTION_TYPE_ICON[entry.type];
              return (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-tint-accent text-accent">
                      <Icon size={15} />
                    </div>
                    {i < summary.timeline.length - 1 && <div className="w-px flex-1 bg-[var(--border-subtle)]" />}
                  </div>
                  <div className="pb-6">
                    <p className="text-sm font-semibold text-body">{ACTION_TYPE_LABEL[entry.type]}</p>
                    <p className="text-xs text-faint">{new Date(entry.at).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function MetaStat({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={large ? "font-display text-xl font-extrabold text-body" : "text-sm font-semibold text-body"}>{value}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-faint">{label}</span>
    </div>
  );
}

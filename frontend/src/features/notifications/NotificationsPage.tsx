import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bell, BellOff } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { incidentsApi } from "@/api/incidents";
import { useIncidentHistoryStore } from "@/stores/incidentHistoryStore";
import { ACTION_TYPE_ICON, ACTION_TYPE_LABEL } from "@/lib/actionMeta";

export function NotificationsPage() {
  const navigate = useNavigate();
  const incidentIds = useIncidentHistoryStore((s) => s.incidentIds);

  const { data: summaries } = useQuery({
    queryKey: ["notifications", incidentIds],
    queryFn: () => Promise.all(incidentIds.map((id) => incidentsApi.summary(id))),
    enabled: incidentIds.length > 0,
  });

  const events = (summaries ?? [])
    .flatMap((summary) => summary.timeline.map((entry) => ({ ...entry, incidentId: summary.incidentId })))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <AppShell>
      <div className="safe-top flex items-center gap-3 px-6 pt-5">
        <button onClick={() => navigate(-1)} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-card-elevated text-body">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-display text-lg font-extrabold text-body">Notifications</h1>
          <p className="text-xs text-faint">Events from Situation Rooms on this device</p>
        </div>
      </div>

      <div className="px-6 pt-6 pb-10">
        {events.length === 0 && (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="grid h-16 w-16 place-items-center rounded-3xl bg-tint-accent text-accent">
              <BellOff size={26} />
            </div>
            <p className="mt-4 font-semibold text-body">Nothing yet</p>
            <p className="mt-1 max-w-[220px] text-sm text-muted">
              Activity from any Situation Room you open or join will appear here.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {events.map((event, i) => {
            const Icon = ACTION_TYPE_ICON[event.type] ?? Bell;
            return (
              <button
                key={i}
                onClick={() => navigate(`/incidents/${event.incidentId}/summary`)}
                className="flex w-full items-center gap-3 rounded-2xl border border-subtle bg-card-elevated p-4 text-left"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tint-accent text-accent">
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-body">{ACTION_TYPE_LABEL[event.type]}</p>
                  <p className="text-xs text-faint">{new Date(event.at).toLocaleString()}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

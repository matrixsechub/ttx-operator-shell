import { StatusPill } from "./StatusPill";
import { useApiResource } from "../lib/useApiResource";
import { operatorDashboardService, type AuditEvent } from "../lib/operatorDashboardService";

function toneForResult(result: AuditEvent["result"]): "verified" | "warn" | "danger" | "neutral" {
  if (result === "success") return "verified";
  if (result === "denied" || result === "escalated") return "warn";
  if (result === "failure") return "danger";
  return "neutral";
}

export function AuditEventStream() {
  const { result, loading, refresh, lastFetchedAt } = useApiResource(
    () => operatorDashboardService.listAuditEvents(50),
    { pollIntervalMs: 15_000 },
  );

  const events = result?.ok ? result.data.events : [];

  return (
    <div id="audit-event-stream" className="op-panel rounded-sm p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Audit event stream</h2>
          <p className="mt-1 text-[11px] text-op-text-dim">
            Append-only governance audit log
            {lastFetchedAt ? ` · synced ${lastFetchedAt.toLocaleTimeString()}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          className="rounded-sm border border-op-border-bright px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-text-dim hover:border-op-accent/50"
        >
          {loading ? "syncing…" : "refresh"}
        </button>
      </div>

      {!result ? (
        <p className="mt-4 text-xs text-op-text-dim">Loading audit events…</p>
      ) : !result.ok ? (
        <p className="mt-4 text-xs text-op-danger">{result.error}</p>
      ) : events.length === 0 ? (
        <p className="mt-4 text-xs text-op-text-dim">No audit events recorded yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-op-text-dim">
                <th className="pb-2 pr-3 font-normal uppercase tracking-widest">Time</th>
                <th className="pb-2 pr-3 font-normal uppercase tracking-widest">Actor</th>
                <th className="pb-2 pr-3 font-normal uppercase tracking-widest">Target</th>
                <th className="pb-2 pr-3 font-normal uppercase tracking-widest">Class</th>
                <th className="pb-2 font-normal uppercase tracking-widest">Result</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.event_id} className="border-t border-op-border/60">
                  <td className="py-2 pr-3 whitespace-nowrap text-op-text-dim">
                    {new Date(event.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2 pr-3">
                    <p className="text-op-text">{event.actor_id}</p>
                    <p className="text-[10px] text-op-text-dim">{event.actor_type}</p>
                  </td>
                  <td className="py-2 pr-3 font-mono">{event.system_target}</td>
                  <td className="py-2 pr-3 font-mono">{event.action_class}</td>
                  <td className="py-2">
                    <StatusPill tone={toneForResult(event.result)}>{event.result}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.ok && result.data.total > events.length ? (
            <p className="mt-3 text-[11px] text-op-text-dim">
              Showing {events.length} of {result.data.total} events
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

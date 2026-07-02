import { StatusPill } from "../../components/StatusPill";
import { useApiResource } from "../../lib/useApiResource";
import { telemetryService } from "../../lib/telemetryService";
import type { TelemetrySeverity } from "../../lib/telemetry";

const SEVERITY_TONE: Record<TelemetrySeverity, "neutral" | "warn" | "danger"> = {
  info: "neutral",
  warn: "warn",
  critical: "danger",
};

// Live-ish telemetry feed across scenario/module/operator streams, delivered
// via the same polling pattern as the rest of the cockpit — not a push-based
// event bus.
export function TelemetryFeed() {
  const { result, loading } = useApiResource(() => telemetryService.getEvents(), { pollIntervalMs: 15_000 });
  const events = result?.ok ? result.data.events : [];

  return (
    <div id="telemetry-feed" className="op-panel rounded-sm p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Telemetry Feed</h2>
        <span className="text-[10px] uppercase tracking-widest text-op-text-dim">{loading ? "syncing…" : "polled"}</span>
      </div>

      {!result || !result.ok ? (
        <p className="mt-3 text-xs italic text-op-text-dim">
          Telemetry not yet connected{result && !result.ok ? ` — ${result.error}` : ""}.
        </p>
      ) : events.length === 0 ? (
        <p className="mt-3 text-xs italic text-op-text-dim">No telemetry events.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {events.map((event) => (
            <li key={event.id} className="flex items-start justify-between gap-2 text-xs">
              <div>
                <span className="text-op-text-dim/70">[{event.stream}]</span>{" "}
                <span className="text-op-text">{event.message}</span>
              </div>
              <StatusPill tone={SEVERITY_TONE[event.severity ?? "info"]}>{event.severity ?? "info"}</StatusPill>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

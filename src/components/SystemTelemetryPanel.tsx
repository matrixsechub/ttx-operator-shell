import { api } from "../lib/apiClient";
import { useApiResource } from "../lib/useApiResource";
import { StatusPill } from "./StatusPill";

const POLL_INTERVAL_MS = 15_000;

export function SystemTelemetryPanel({ compact = false }: { compact?: boolean }) {
  const { result, loading, lastFetchedAt, refresh } = useApiResource(api.getSystemState, {
    pollIntervalMs: POLL_INTERVAL_MS,
  });

  const state = result?.ok ? result.data.state : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Telemetry</h2>
        <button
          type="button"
          onClick={() => refresh()}
          className="text-[10px] uppercase tracking-widest text-op-accent hover:underline"
        >
          {loading ? "syncing…" : "refresh"}
        </button>
      </div>

      {!result ? (
        <div className="op-panel rounded-sm p-3 text-xs text-op-text-dim">Awaiting first sync…</div>
      ) : !result.ok ? (
        <div className="op-panel rounded-sm border-op-danger/40 p-3 text-xs text-op-danger">
          Kernel unreachable — {result.error}
        </div>
      ) : !state ? (
        <div className="op-panel rounded-sm p-3 text-xs text-op-text-dim">No kernel state</div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="op-panel flex items-center justify-between rounded-sm p-2.5 text-xs">
            <span className="text-op-text-dim">Ghost layer</span>
            <StatusPill tone={state.ghost?.connected ? "ok" : "warn"}>
              {state.ghost?.connected ? "connected" : "fallback"}
            </StatusPill>
          </div>
          <div className="op-panel flex items-center justify-between rounded-sm p-2.5 text-xs">
            <span className="text-op-text-dim">System mode</span>
            <StatusPill tone="ok">{state.systemMode}</StatusPill>
          </div>
          {!compact && (
            <div className="op-panel rounded-sm p-2.5 text-xs text-op-text-dim">
              Requests: {String(state.telemetry?.requestCount ?? "—")} · p50{" "}
              {String(state.telemetry?.latencyP50Ms ?? "—")}ms · errors{" "}
              {String(state.telemetry?.errorCount ?? "—")}
            </div>
          )}
        </div>
      )}

      <div className="text-[10px] text-op-text-dim">
        source: /api/system/state
        {lastFetchedAt ? ` · synced ${lastFetchedAt.toLocaleTimeString()}` : ""}
      </div>
    </div>
  );
}

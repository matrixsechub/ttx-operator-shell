import { api } from "../lib/apiClient";
import { useApiResource } from "../lib/useApiResource";
import { StatusPill } from "./StatusPill";

const POLL_INTERVAL_MS = 15_000;

export function SystemTelemetryPanel({ compact = false }: { compact?: boolean }) {
  const { result, loading, lastFetchedAt, refresh } = useApiResource(api.getSystemStatus, {
    pollIntervalMs: POLL_INTERVAL_MS,
  });

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
          Engine unreachable — {result.error}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="op-panel flex items-center justify-between rounded-sm p-2.5 text-xs">
            <span className="text-op-text-dim">Harness</span>
            <StatusPill tone={result.data.harness?.state === "online" ? "ok" : "warn"}>
              {result.data.harness?.state ?? "unknown"}
            </StatusPill>
          </div>
          <div className="op-panel flex items-center justify-between rounded-sm p-2.5 text-xs">
            <span className="text-op-text-dim">API</span>
            <StatusPill tone={result.data.api?.available ? "ok" : "danger"}>
              {result.data.api?.available ? "available" : "down"}
            </StatusPill>
          </div>
          {!compact && (
            <div className="op-panel rounded-sm p-2.5 text-xs text-op-text-dim">
              Last successful call: {result.data.lastSuccessfulCall ?? "—"}
            </div>
          )}
        </div>
      )}

      <div className="text-[10px] text-op-text-dim">
        {lastFetchedAt ? `synced ${lastFetchedAt.toLocaleTimeString()}` : "not yet synced"}
      </div>
    </div>
  );
}

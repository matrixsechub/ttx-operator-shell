import { OperatorShell } from "../components/OperatorShell";
import { StatusPill } from "../components/StatusPill";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { api } from "../lib/apiClient";
import { useApiResource } from "../lib/useApiResource";

const POLL_INTERVAL_MS = 10_000;

export function Status() {
  const { result, loading, lastFetchedAt, refresh } = useApiResource(api.getSystemStatus, {
    pollIntervalMs: POLL_INTERVAL_MS,
  });

  return (
    <OperatorShell>
      <div className="flex flex-col gap-5">
        <Breadcrumbs trail={[{ label: "Cockpit", to: "/dashboard" }, { label: "Status" }]} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg uppercase tracking-widest text-op-accent">System Status</h1>
            <p className="mt-1 text-xs text-op-text-dim">Harness and API health, polled every 10s.</p>
          </div>
          <button
            type="button"
            onClick={() => refresh()}
            className="rounded-sm border border-op-border-bright px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-text-dim hover:border-op-accent/50 hover:text-op-accent"
          >
            {loading ? "syncing…" : "refresh"}
          </button>
        </div>

        {!result ? (
          <div className="op-panel rounded-sm p-6 text-center text-xs text-op-text-dim">Checking system status…</div>
        ) : !result.ok ? (
          <div className="op-panel rounded-sm border-op-danger/40 p-6 text-xs text-op-danger">
            <p className="uppercase tracking-widest">Engine unreachable</p>
            <p className="mt-2 text-op-text-dim">{result.error}</p>
            <p className="mt-2 text-op-text-dim">
              The storefront SPA continues to function; only live telemetry is degraded.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="op-panel rounded-sm p-4">
              <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Harness</h2>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-op-text">{result.data.harness?.detail ?? "No detail reported"}</span>
                <StatusPill tone={result.data.harness?.state === "online" ? "ok" : "warn"}>
                  {result.data.harness?.state ?? "unknown"}
                </StatusPill>
              </div>
            </div>

            <div className="op-panel rounded-sm p-4">
              <h2 className="text-xs uppercase tracking-widest text-op-text-dim">API Availability</h2>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-op-text">{result.data.api?.detail ?? "No detail reported"}</span>
                <StatusPill tone={result.data.api?.available ? "ok" : "danger"}>
                  {result.data.api?.available ? "available" : "down"}
                </StatusPill>
              </div>
            </div>

            <div className="op-panel rounded-sm p-4 sm:col-span-2">
              <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Last Successful Call</h2>
              <p className="mt-2 text-sm text-op-text">{result.data.lastSuccessfulCall ?? "—"}</p>
            </div>

            {result.data.errors && result.data.errors.length > 0 && (
              <div className="op-panel rounded-sm border-op-danger/40 p-4 sm:col-span-2">
                <h2 className="text-xs uppercase tracking-widest text-op-danger">Reported Errors</h2>
                <ul className="mt-2 flex flex-col gap-1 text-xs text-op-text-dim">
                  {result.data.errors.map((err, idx) => (
                    <li key={idx}>&bull; {err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="text-[11px] text-op-text-dim">
          {lastFetchedAt ? `Last synced ${lastFetchedAt.toLocaleTimeString()}` : "Not yet synced"}
        </div>
      </div>
    </OperatorShell>
  );
}

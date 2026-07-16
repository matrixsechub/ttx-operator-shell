import { OperatorShell } from "../components/OperatorShell";
import { GovernanceStatePanel } from "../components/GovernanceStatePanel";
import { StatusPill } from "../components/StatusPill";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { EntityVoice } from "../components/EntityVoice";
import { api } from "../lib/apiClient";
import { useApiResource } from "../lib/useApiResource";

const POLL_INTERVAL_MS = 10_000;

export function Status() {
  const { result, loading, lastFetchedAt, refresh } = useApiResource(api.getSystemState, {
    pollIntervalMs: POLL_INTERVAL_MS,
  });

  const state = result?.ok ? result.data.state : null;

  return (
    <OperatorShell>
      <div className="flex flex-col gap-5">
        <Breadcrumbs trail={[{ label: "Cockpit", to: "/dashboard" }, { label: "Status" }]} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg uppercase tracking-widest text-op-accent">System Status</h1>
            <p className="mt-1 text-xs text-op-text-dim">Unified kernel state, polled every 10s.</p>
            <EntityVoice entity="beacon">kernel state is the governance signal of record.</EntityVoice>
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
            <p className="uppercase tracking-widest">Kernel unreachable</p>
            <p className="mt-2 text-op-text-dim">{result.error}</p>
          </div>
        ) : !state ? (
          <div className="op-panel rounded-sm p-6 text-center text-xs text-op-text-dim">Empty kernel state</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="op-panel rounded-sm p-4">
              <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Ghost layer</h2>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-op-text">{state.ghost?.authMethod ?? "—"}</span>
                <StatusPill tone={state.ghost?.connected ? "ok" : "danger"}>
                  {state.ghost?.connected ? "connected" : "degraded"}
                </StatusPill>
              </div>
            </div>

            <div className="op-panel rounded-sm p-4">
              <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Telemetry</h2>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-op-text">
                  {state.telemetry?.requestCount ?? 0} req · {state.telemetry?.latencyP50Ms ?? 0}ms p50
                </span>
                <StatusPill tone={(state.telemetry?.errorCount ?? 0) === 0 ? "ok" : "warn"}>
                  {state.telemetry?.errorCount ?? 0} errors
                </StatusPill>
              </div>
            </div>

            <div className="op-panel rounded-sm p-4 sm:col-span-2">
              <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Assembled at</h2>
              <p className="mt-2 text-sm text-op-text">{state.assembledAt}</p>
            </div>
          </div>
        )}

        <GovernanceStatePanel compact />

        <div className="text-[11px] text-op-text-dim">
          source: /api/system/state
          {lastFetchedAt ? ` · Last synced ${lastFetchedAt.toLocaleTimeString()}` : ""}
        </div>
      </div>
    </OperatorShell>
  );
}

import { OperatorShell } from "../components/OperatorShell";
import { GovernanceStatePanel } from "../components/GovernanceStatePanel";
import { StatusPill } from "../components/StatusPill";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { api } from "../lib/apiClient";
import { useApiResource } from "../lib/useApiResource";

const POLL_INTERVAL_MS = 10_000;

function truncateHash(hash: string): string {
  if (hash.length <= 20) return hash;
  return `${hash.slice(0, 10)}…${hash.slice(-10)}`;
}

async function copyHash(hash: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(hash);
  }
}

export function Status() {
  const { result, loading, lastFetchedAt, refresh } = useApiResource(api.getSystemState, {
    pollIntervalMs: POLL_INTERVAL_MS,
  });

  const state = result?.ok ? result.data.state : null;
  const operatorOs = state?.operatorOs;

  return (
    <OperatorShell>
      <div className="flex flex-col gap-5">
        <Breadcrumbs trail={[{ label: "Cockpit", to: "/dashboard" }, { label: "Status" }]} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg uppercase tracking-widest text-op-accent">System Status</h1>
            <p className="mt-1 text-xs text-op-text-dim">Unified kernel state, polled every 10s.</p>
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
              <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Beacon</h2>
              <div className="mt-3 flex items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-op-text">
                    {operatorOs?.beacon.hash ? truncateHash(operatorOs.beacon.hash) : "—"}
                  </p>
                  <p className="mt-1 text-[11px] text-op-text-dim">
                    v{operatorOs?.beacon.version ?? 1} · {operatorOs?.beacon.id ?? "BEACON::NORTHSTAR"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {operatorOs?.beacon.hash ? (
                    <button
                      type="button"
                      onClick={() => void copyHash(operatorOs.beacon.hash)}
                      className="rounded-sm border border-op-border px-2 py-1 text-[10px] uppercase tracking-widest text-op-text-dim hover:border-op-accent/50"
                    >
                      copy
                    </button>
                  ) : null}
                  <StatusPill tone={operatorOs?.beacon.safeMode ? "warn" : "ok"}>
                    {operatorOs?.beacon.safeMode ? "safe mode" : "verified"}
                  </StatusPill>
                </div>
              </div>
            </div>

            <div className="op-panel rounded-sm p-4">
              <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Codex Manifest</h2>
              <div className="mt-3">
                <p className="font-mono text-xs text-op-text">
                  {operatorOs?.codex.manifestHash ? truncateHash(operatorOs.codex.manifestHash) : "—"}
                </p>
                <p className="mt-1 text-[11px] text-op-text-dim">
                  drift {operatorOs?.codex.driftCount ?? 0}
                  {operatorOs?.codex.lastValidatedAt
                    ? ` · validated ${new Date(operatorOs.codex.lastValidatedAt).toLocaleString()}`
                    : " · not validated"}
                </p>
              </div>
            </div>

            <div className="op-panel rounded-sm p-4">
              <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Queues</h2>
              <div className="mt-3 space-y-2 text-sm text-op-text">
                <p>
                  Activation {operatorOs?.queues.activation.pending ?? 0} pending /{" "}
                  {operatorOs?.queues.activation.total ?? 0} total
                </p>
                <p className="text-[11px] text-op-text-dim">
                  {operatorOs?.queues.activation.date ?? "—"} · max{" "}
                  {operatorOs?.queues.activation.maxPerDay ?? 0}/day
                </p>
                <p>Registration queue {operatorOs?.queues.registration.length ?? 0}</p>
              </div>
            </div>

            <div className="op-panel rounded-sm p-4">
              <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Approvals</h2>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-op-text">
                  {operatorOs?.approvals.pending ?? 0} pending · {operatorOs?.approvals.expired ?? 0} expired
                </span>
                <StatusPill tone={(operatorOs?.approvals.pending ?? 0) > 0 ? "warn" : "ok"}>
                  {(operatorOs?.approvals.pending ?? 0) > 0 ? "action needed" : "clear"}
                </StatusPill>
              </div>
            </div>

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

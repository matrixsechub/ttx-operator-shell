import { api } from "../lib/apiClient";
import { useApiResource } from "../lib/useApiResource";
import { StatusPill } from "./StatusPill";

const POLL_INTERVAL_MS = 20_000;

export function GovernanceStatePanel({ compact = false }: { compact?: boolean }) {
  const { result, loading, lastFetchedAt, refresh } = useApiResource(api.getSystemState, {
    pollIntervalMs: POLL_INTERVAL_MS,
  });

  const state = result?.ok ? result.data.state : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-state-governance">Governance</h2>
        <button
          type="button"
          onClick={() => refresh()}
          className="text-[10px] uppercase tracking-widest text-op-accent hover:underline"
        >
          {loading ? "syncing…" : "refresh"}
        </button>
      </div>

      {!result ? (
        <div className="op-panel rounded-sm p-3 text-xs text-op-text-dim">Awaiting kernel state…</div>
      ) : !result.ok ? (
        <div className="op-panel rounded-sm border-op-danger/40 p-3 text-xs text-op-danger">
          Kernel unreachable — {result.error}
        </div>
      ) : !state ? (
        <div className="op-panel rounded-sm p-3 text-xs text-op-text-dim">No state payload</div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="op-panel rounded-sm p-2.5 text-xs">
            <p className="text-[10px] uppercase tracking-widest text-op-text-dim">Northstar v{state.governance.northstar.version}</p>
            <p className="mt-1 text-sm text-op-text">{state.governance.northstar.statement}</p>
          </div>

          {!compact && (
            <div className="op-panel rounded-sm p-2.5 text-xs">
              <p className="text-[10px] uppercase tracking-widest text-op-text-dim">Strategic axes</p>
              <ul className="mt-2 flex flex-col gap-1">
                {state.governance.strategicAxis.map((axis) => (
                  <li key={axis.id} className="flex items-center justify-between">
                    <span className="text-op-text">{axis.name}</span>
                    <StatusPill tone={axis.status === "active" ? "ok" : axis.status === "watch" ? "warn" : "danger"}>
                      {axis.status}
                    </StatusPill>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="op-panel rounded-sm p-2.5 text-xs">
            <p className="text-[10px] uppercase tracking-widest text-op-text-dim">Enforcement</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusPill tone={state.policy.marketplaceValidationRequired ? "ok" : "warn"}>
                marketplace {state.policy.marketplaceValidationRequired ? "required" : "optional"}
              </StatusPill>
              <StatusPill tone={state.policy.wildcardFeaturesEnabled ? "warn" : "ok"}>
                wildcard {state.policy.wildcardFeaturesEnabled ? "enabled" : "blocked"}
              </StatusPill>
              <StatusPill tone="ok">{state.policy.mode}</StatusPill>
            </div>
          </div>

          {!compact && state.governance.eventLog.length > 0 && (
            <div className="op-panel rounded-sm p-2.5 text-xs">
              <p className="text-[10px] uppercase tracking-widest text-op-text-dim">Recent decisions</p>
              <ul className="mt-2 flex flex-col gap-1 text-op-text-dim">
                {state.governance.eventLog.slice(-5).reverse().map((event) => (
                  <li key={event.id}>
                    <span className="text-op-accent">{event.type}</span> — {event.actor}{" "}
                    <span className="text-[10px]">{new Date(event.ts).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
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

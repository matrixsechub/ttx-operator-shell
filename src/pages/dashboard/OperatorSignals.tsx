import { StatusPill } from "../../components/StatusPill";
import { api } from "../../lib/apiClient";
import { useApiResource } from "../../lib/useApiResource";

export function OperatorSignals() {
  const { result, loading } = useApiResource(api.getSystemState, { pollIntervalMs: 15_000 });
  const state = result?.ok ? result.data.state : null;
  const errorCount = state?.telemetry?.errorCount ?? 0;
  const govEvents = (state?.telemetry?.governanceEventCount as number | undefined) ?? 0;

  return (
    <div id="operator-signals" className="op-panel rounded-sm p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Operator Signals</h2>
        <StatusPill tone={!result || !result.ok ? "neutral" : errorCount === 0 ? "ok" : "warn"}>
          {loading ? "syncing" : !result || !result.ok ? "unknown" : errorCount === 0 ? "clear" : `${errorCount}`}
        </StatusPill>
      </div>

      {!result || !result.ok ? (
        <p className="mt-3 text-xs italic text-op-text-dim">
          Signal feed unavailable{result && !result.ok ? ` — ${result.error}` : ""}.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5 text-xs text-op-text-dim">
          <li>Telemetry errors: {errorCount}</li>
          <li>Governance events: {govEvents}</li>
          <li>Ghost: {state?.ghost?.connected ? "connected" : "fallback"}</li>
          <li>Mode: {state?.systemMode ?? "—"}</li>
        </ul>
      )}
    </div>
  );
}

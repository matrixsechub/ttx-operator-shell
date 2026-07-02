import { StatusPill } from "../../components/StatusPill";
import { api } from "../../lib/apiClient";
import { useApiResource } from "../../lib/useApiResource";

// Surfaces SystemStatus.errors (already returned by the existing
// getSystemStatus call) as a compact operator-facing signal feed. No new
// data source — same polling pattern as Status.tsx.
export function OperatorSignals() {
  const { result, loading } = useApiResource(api.getSystemStatus, { pollIntervalMs: 15_000 });
  const signals = result?.ok ? (result.data.errors ?? []) : [];

  return (
    <div id="operator-signals" className="op-panel rounded-sm p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Operator Signals</h2>
        <StatusPill tone={!result || !result.ok ? "neutral" : signals.length === 0 ? "ok" : "warn"}>
          {loading ? "syncing" : !result || !result.ok ? "unknown" : signals.length === 0 ? "clear" : `${signals.length}`}
        </StatusPill>
      </div>

      {!result || !result.ok ? (
        <p className="mt-3 text-xs italic text-op-text-dim">
          Signal feed unavailable{result && !result.ok ? ` — ${result.error}` : ""}.
        </p>
      ) : signals.length === 0 ? (
        <p className="mt-3 text-xs italic text-op-text-dim">No active signals.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5">
          {signals.map((signal, index) => (
            <li key={index} className="text-xs text-op-text-dim">
              &bull; {signal}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

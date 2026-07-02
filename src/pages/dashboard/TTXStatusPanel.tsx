import { Link } from "react-router-dom";
import { useApiResource } from "../../lib/useApiResource";
import { ttxService } from "../../operator/ttx/service";
import type { TTXScenarioStatus } from "../../operator/ttx/types";

const STATUS_ORDER: TTXScenarioStatus[] = ["draft", "published", "archived"];

// Aggregates TTX scenario counts by status for a cockpit-level glance —
// reuses the same ttxService.listScenarios call the TTX shell already makes.
export function TTXStatusPanel() {
  const { result, loading } = useApiResource(ttxService.listScenarios);
  const scenarios = result?.ok ? result.data.scenarios : [];

  const counts = STATUS_ORDER.reduce<Record<TTXScenarioStatus, number>>(
    (acc, status) => {
      acc[status] = scenarios.filter((s) => s.status === status).length;
      return acc;
    },
    { draft: 0, published: 0, archived: 0 },
  );

  return (
    <div id="ttx-status-panel" className="op-panel rounded-sm p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-op-text-dim">TTX Scenarios</h2>
        <Link to="/ttx" className="text-[10px] uppercase tracking-widest text-op-accent hover:underline">
          open &rarr;
        </Link>
      </div>

      {!result || !result.ok ? (
        <p className="mt-3 text-xs italic text-op-text-dim">
          {loading ? "syncing…" : `Engine unreachable${result && !result.ok ? ` — ${result.error}` : ""}.`}
        </p>
      ) : scenarios.length === 0 ? (
        <p className="mt-3 text-xs italic text-op-text-dim">No scenarios saved yet.</p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {STATUS_ORDER.map((status) => (
            <div key={status} className="rounded-sm border border-op-border-bright py-2">
              <p className="text-lg text-op-accent">{counts[status]}</p>
              <p className="text-[10px] uppercase tracking-widest text-op-text-dim">{status}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

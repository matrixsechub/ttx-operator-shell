import { useEffect } from "react";
import { InfoCard } from "../../components/InfoCard";
import { useApiResource } from "../../lib/useApiResource";
import { ttxService } from "./service";
import { useScenarioContext } from "./ScenarioContext";

// Scoring engine stub. The real scoring engine lives in the harness/engine —
// this just renders whatever it returns, or an honest "not connected" state.
// Score entries are technically keyed by session, not scenario, but there's
// no session-creation flow yet (TTXSession is unused elsewhere too) — the
// selected scenario id stands in for it until that concept is built.
export function TTXScore() {
  const { selectedScenarioId } = useScenarioContext();
  const { result, loading, refresh } = useApiResource(() => ttxService.getScore(selectedScenarioId ?? ""));
  const rubric = useApiResource(() => ttxService.getRubric(selectedScenarioId ?? ""));

  useEffect(() => {
    if (selectedScenarioId) {
      refresh();
      rubric.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScenarioId]);

  const entries = result?.ok ? result.data.entries : [];
  const criteria = rubric.result?.ok ? rubric.result.data.rubric.criteria : [];

  if (!selectedScenarioId) {
    return (
      <InfoCard label="Scoring Engine">
        <p className="text-xs italic text-op-text-dim">Select a scenario above to view its rubric and scores.</p>
      </InfoCard>
    );
  }

  return (
    <InfoCard label="Scoring Engine">
      <div className="mb-4 border-b border-op-border pb-3">
        <h3 className="text-[10px] uppercase tracking-widest text-op-text-dim/70">Scoring Rubric</h3>
        {!rubric.result || !rubric.result.ok ? (
          <p className="mt-1.5 text-xs italic text-op-text-dim">
            Scoring rubric not yet connected{rubric.result && !rubric.result.ok ? ` — ${rubric.result.error}` : ""}.
          </p>
        ) : criteria.length === 0 ? (
          <p className="mt-1.5 text-xs italic text-op-text-dim">No rubric defined for this scenario yet.</p>
        ) : (
          <ul className="mt-1.5 flex flex-col gap-1 text-xs">
            {criteria.map((criterion) => (
              <li key={criterion.id} className="flex items-baseline justify-between gap-2">
                <span className="text-op-text">
                  {criterion.label}
                  {criterion.description && <span className="ml-1.5 text-op-text-dim">— {criterion.description}</span>}
                </span>
                <span className="whitespace-nowrap text-op-accent">{criterion.maxPoints} pts</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-op-text-dim">Per-role scoring for the active session.</p>
        <button
          type="button"
          onClick={() => refresh()}
          className="text-[10px] uppercase tracking-widest text-op-accent hover:underline"
        >
          {loading ? "syncing…" : "refresh"}
        </button>
      </div>

      {!result || !result.ok ? (
        <p className="text-xs italic text-op-text-dim">
          Scoring engine not yet connected{result && !result.ok ? ` — ${result.error}` : ""}.
        </p>
      ) : entries.length === 0 ? (
        <p className="text-xs italic text-op-text-dim">No scored sessions yet.</p>
      ) : (
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-op-text-dim">
              <th className="pb-1 font-normal">Role</th>
              <th className="pb-1 font-normal">Points</th>
              <th className="pb-1 font-normal">Notes</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-t border-op-border">
                <td className="py-1.5 text-op-text">{entry.roleId}</td>
                <td className="py-1.5 text-op-accent">{entry.points}</td>
                <td className="py-1.5 text-op-text-dim">{entry.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </InfoCard>
  );
}

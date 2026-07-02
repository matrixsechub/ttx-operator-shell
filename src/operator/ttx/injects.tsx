import { useEffect } from "react";
import { InfoCard } from "../../components/InfoCard";
import { StatusPill } from "../../components/StatusPill";
import { useApiResource } from "../../lib/useApiResource";
import { ttxService } from "./service";
import { useScenarioContext } from "./ScenarioContext";

const SEVERITY_TONE = {
  info: "neutral",
  elevated: "warn",
  critical: "danger",
} as const;

// Inject management for the active scenario, selected via ScenarioContext
// (set in Builder once a scenario is saved).
export function TTXInjects() {
  const { selectedScenarioId } = useScenarioContext();
  const { result, loading, refresh } = useApiResource(() => ttxService.listInjects(selectedScenarioId ?? ""));

  useEffect(() => {
    if (selectedScenarioId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScenarioId]);

  const injects = result?.ok ? result.data.injects : [];

  return (
    <InfoCard label="Inject Management">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-op-text-dim">Timed events that fire during a live session.</p>
        <button
          type="button"
          onClick={() => refresh()}
          className="text-[10px] uppercase tracking-widest text-op-accent hover:underline"
        >
          {loading ? "syncing…" : "refresh"}
        </button>
      </div>

      {!selectedScenarioId ? (
        <p className="text-xs italic text-op-text-dim">Select a scenario above to view its injects.</p>
      ) : !result || !result.ok || injects.length === 0 ? (
        <p className="text-xs italic text-op-text-dim">
          {!result || result.ok ? "No injects yet for this scenario." : `Engine unreachable — ${result.error}`}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {injects.map((inject) => (
            <li key={inject.id} className="flex items-center justify-between rounded-sm border border-op-border-bright px-3 py-2">
              <div>
                <p className="text-sm text-op-text">{inject.title}</p>
                <p className="text-[11px] text-op-text-dim">T+{inject.triggerAtMinutes}min</p>
              </div>
              <StatusPill tone={SEVERITY_TONE[inject.severity]}>{inject.severity}</StatusPill>
            </li>
          ))}
        </ul>
      )}
    </InfoCard>
  );
}

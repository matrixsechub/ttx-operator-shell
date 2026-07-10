import { useMemo } from "react";
import { InfoCard } from "../../components/InfoCard";
import { StatusPill } from "../../components/StatusPill";
import { localScenarioToInjects } from "./scenarioBridge";
import { useScenarioContext } from "./ScenarioContext";

const SEVERITY_TONE = {
  info: "neutral",
  elevated: "warn",
  critical: "danger",
} as const;

export function TTXInjects() {
  const { selectedScenarioId, localById } = useScenarioContext();

  const injects = useMemo(() => {
    if (!selectedScenarioId) return [];
    const local = localById[selectedScenarioId];
    return local ? localScenarioToInjects(local) : [];
  }, [localById, selectedScenarioId]);

  return (
    <InfoCard label="Inject Management">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-op-text-dim">Timed events that fire during a live session.</p>
      </div>

      {!selectedScenarioId ? (
        <p className="text-xs italic text-op-text-dim">Select a scenario above to view its injects.</p>
      ) : injects.length === 0 ? (
        <p className="text-xs italic text-op-text-dim">
          Built-in scenarios expose injects during live sessions. Author a scenario in Builder to preview node injects here.
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

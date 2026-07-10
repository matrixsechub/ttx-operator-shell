import { useMemo } from "react";
import { InfoCard } from "../../components/InfoCard";
import { localScenarioToInjects } from "./scenarioBridge";
import { useScenarioContext } from "./ScenarioContext";

export function TTXTimeline() {
  const { selectedScenarioId, localById } = useScenarioContext();

  const injects = useMemo(() => {
    if (!selectedScenarioId) return [];
    const local = localById[selectedScenarioId];
    return local ? localScenarioToInjects(local) : [];
  }, [localById, selectedScenarioId]);

  const maxMinute = Math.max(60, ...injects.map((inject) => inject.triggerAtMinutes));

  return (
    <InfoCard label="Playback Timeline">
      {!selectedScenarioId ? (
        <p className="text-xs italic text-op-text-dim">Select a scenario above to view its timeline.</p>
      ) : (
        <>
          <div className="relative h-16 w-full rounded-sm border border-op-border-bright bg-black/20">
            <div className="absolute inset-x-3 top-1/2 h-px -translate-y-1/2 bg-op-border-bright" />
            {injects.map((inject) => (
              <div
                key={inject.id}
                className="group absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-op-accent"
                style={{ left: `${(inject.triggerAtMinutes / maxMinute) * 100}%` }}
                title={`${inject.title} — T+${inject.triggerAtMinutes}min`}
              />
            ))}
            {injects.length === 0 && (
              <p className="absolute inset-0 flex items-center justify-center text-[11px] italic text-op-text-dim">
                Built-in scenarios render injects during live sessions.
              </p>
            )}
          </div>
          <p className="mt-2 text-[11px] text-op-text-dim">0min &mdash; {maxMinute}min</p>
        </>
      )}
    </InfoCard>
  );
}

import { useEffect } from "react";
import { InfoCard } from "../../components/InfoCard";
import { useApiResource } from "../../lib/useApiResource";
import { ttxService } from "./service";
import { useScenarioContext } from "./ScenarioContext";

// Playback timeline — lays out injects along a horizontal track scaled by
// triggerAtMinutes, for the scenario selected via ScenarioContext.
export function TTXTimeline() {
  const { selectedScenarioId } = useScenarioContext();
  const { result, refresh } = useApiResource(() => ttxService.listInjects(selectedScenarioId ?? ""));

  useEffect(() => {
    if (selectedScenarioId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScenarioId]);

  const injects = result?.ok ? result.data.injects : [];
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
                No injects scheduled yet.
              </p>
            )}
          </div>
          <p className="mt-2 text-[11px] text-op-text-dim">0min &mdash; {maxMinute}min</p>
        </>
      )}
    </InfoCard>
  );
}

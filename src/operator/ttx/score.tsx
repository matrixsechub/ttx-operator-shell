import { useEffect } from "react";
import { InfoCard } from "../../components/InfoCard";
import { useApiResource } from "../../lib/useApiResource";
import type { ApiResult } from "../../lib/apiClient";
import { ttxScoringService } from "../../lib/ttxScoringService";
import { getCurrentSessionId } from "../../lib/ttxSessionStorage";
import type { TtxScorePacket } from "../../lib/ttxTypes";
import { useScenarioContext } from "./ScenarioContext";

export function TTXScore() {
  const { selectedScenarioId } = useScenarioContext();
  const sessionId = getCurrentSessionId();
  const { result, loading, refresh } = useApiResource(() => {
    if (!sessionId) {
      return Promise.resolve<ApiResult<TtxScorePacket>>({ ok: false, error: "No active session" });
    }
    return ttxScoringService.getScore(sessionId);
  });

  useEffect(() => {
    if (sessionId) refresh();
  }, [sessionId, refresh]);

  const scorePacket = result?.ok ? result.data : null;

  if (!selectedScenarioId) {
    return (
      <InfoCard label="Scoring Engine">
        <p className="text-xs italic text-op-text-dim">Select a scenario above to view scoring context.</p>
      </InfoCard>
    );
  }

  return (
    <InfoCard label="Scoring Engine">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-op-text-dim">
          Session scores from the Worker graph engine. Start a session from the cockpit TTX panel to populate scores.
        </p>
        <button
          type="button"
          onClick={() => refresh()}
          className="text-[10px] uppercase tracking-widest text-op-accent hover:underline"
        >
          {loading ? "syncing…" : "refresh"}
        </button>
      </div>

      {!sessionId ? (
        <p className="text-xs italic text-op-text-dim">No active TTX session — start one from the dashboard TTX panel.</p>
      ) : !result || !result.ok ? (
        <p className="text-xs italic text-op-text-dim">
          No score yet for this session{result && !result.ok ? ` — ${result.error}` : ""}.
        </p>
      ) : (
        <div className="flex flex-col gap-2 text-xs">
          <p className="text-op-text">
            Total score: <span className="text-op-accent">{scorePacket?.score ?? 0}</span>
          </p>
          <p className="text-op-text-dim">Session: {scorePacket?.sessionId}</p>
          <p className="text-op-text-dim">Scenario: {scorePacket?.scenarioId}</p>
        </div>
      )}
    </InfoCard>
  );
}

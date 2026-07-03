import { InfoCard } from "./InfoCard";
import type { TtxScorePacket } from "../lib/ttxTypes";

// Read-only display of one completed session's score packet (Phase 32) —
// shown in TTXPanel once a session finishes. "Download Score" is a plain
// client-side Blob download of the already-fetched packet (same pattern
// as ScenarioAuthoringPanel's scenario export), not a re-importable
// artifact — a session score is a historical record, not an authored
// scenario, so it has no signature and no import path.
export function TTXScorePanel({ packet }: { packet: TtxScorePacket }) {
  function handleDownload() {
    const json = JSON.stringify(packet, null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `ttx-score-${packet.sessionId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <InfoCard label="Session Score" className="mt-3">
      <div className="flex flex-col gap-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-2xl text-op-accent">{packet.score}</span>
          <button type="button" onClick={handleDownload} className="text-[10px] text-op-accent hover:underline">
            download score
          </button>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-op-text-dim">
          <span>
            mitigating: <span className="text-op-text">{packet.breakdown.mitigations}</span>
          </span>
          <span>
            risk escalations: <span className="text-op-text">{packet.breakdown.riskEscalations}</span>
          </span>
          <span>
            delays: <span className="text-op-text">{packet.breakdown.delays}</span>
          </span>
        </div>

        {(packet.roleActions.recommendedTaken.length > 0 || packet.roleActions.recommendedMissed.length > 0) && (
          <div className="flex flex-col gap-0.5">
            {packet.roleActions.recommendedTaken.length > 0 && (
              <span className="text-op-text-dim">
                recommended taken: <span className="text-op-text">{packet.roleActions.recommendedTaken.join(", ")}</span>
              </span>
            )}
            {packet.roleActions.recommendedMissed.length > 0 && (
              <span className="text-op-text-dim">
                recommended missed: <span className="text-op-danger">{packet.roleActions.recommendedMissed.join(", ")}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </InfoCard>
  );
}

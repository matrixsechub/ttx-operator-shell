import { useEffect } from "react";
import { InfoCard } from "../../components/InfoCard";
import { StatusPill } from "../../components/StatusPill";
import { useApiResource } from "../../lib/useApiResource";
import { ttxHistoryService } from "../../lib/ttxHistoryService";
import type { TtxHistoryPacket, TtxScoreBand } from "../../lib/ttxTypes";
import { useScenarioContext } from "./ScenarioContext";

// Phase 37 — surfaces the Phase 34 history engine (worker/ttxHistory.ts),
// which shipped with no UI consumer. Read-only: every row is derived on
// read by the Worker from an existing score + analytics packet, so nothing
// here writes, and history covers scored sessions only — Phase 27
// deliberately never exposed a list-all-sessions endpoint.

const BAND_TONE: Record<TtxScoreBand, "ok" | "warn" | "danger"> = {
  strong: "ok",
  mixed: "warn",
  degraded: "danger",
};

function formatDuration(startedAt: string, completedAt: string): string | null {
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function HistoryRow({ packet }: { packet: TtxHistoryPacket }) {
  const duration = formatDuration(packet.startedAt, packet.completedAt);

  return (
    <li className="flex items-center justify-between gap-3 rounded-sm border border-op-border-bright px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm text-op-text">{packet.scenarioName}</p>
        <p className="text-[11px] text-op-text-dim">
          {new Date(packet.completedAt).toLocaleString()}
          {duration ? ` · ran ${duration}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm text-op-accent">{packet.score}</span>
        <StatusPill tone={BAND_TONE[packet.band]}>{packet.band}</StatusPill>
      </div>
    </li>
  );
}

export function TTXHistory() {
  const { selectedScenarioId } = useScenarioContext();

  const { result, loading, refresh } = useApiResource(() =>
    selectedScenarioId
      ? ttxHistoryService.getSessionHistoryByScenario(selectedScenarioId)
      : ttxHistoryService.getSessionHistory(),
  );

  // refresh() is a stable callback, so the hook's own effect only fires on
  // mount — re-fetch explicitly when the operator switches scenarios.
  useEffect(() => {
    refresh();
  }, [selectedScenarioId, refresh]);

  // Worker returns newest-first (worker/ttxHistory.ts sorts on completedAt);
  // rendering in received order keeps one ordering authority.
  const history = result?.ok ? result.data.history : null;

  return (
    <InfoCard label="Session History">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-op-text-dim">
          {selectedScenarioId
            ? "Scored sessions for the active scenario, newest first."
            : "Scored sessions across every scenario, newest first."}
        </p>
        <button
          type="button"
          onClick={() => refresh()}
          className="shrink-0 text-[10px] uppercase tracking-widest text-op-accent hover:underline"
        >
          {loading ? "syncing…" : "refresh"}
        </button>
      </div>

      {!result ? (
        <p className="text-xs italic text-op-text-dim">Loading session history…</p>
      ) : !result.ok ? (
        <p className="text-xs italic text-op-text-dim">Could not load session history — {result.error}.</p>
      ) : history && history.length === 0 ? (
        <p className="text-xs italic text-op-text-dim">
          No scored sessions yet
          {selectedScenarioId ? " for this scenario" : ""}. Run a session to completion and score it to populate history.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {history?.map((packet) => (
            <HistoryRow key={packet.sessionId} packet={packet} />
          ))}
        </ul>
      )}
    </InfoCard>
  );
}

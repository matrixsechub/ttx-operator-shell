import { useState } from "react";
import type { LiveVote } from "../lib/liveSessionService";

interface Choice {
  choice: string;
  label: string;
}

interface Props {
  votes: LiveVote[];
  currentNodeId: string | null;
  choices: Choice[];
  isHost: boolean;
  onAdvance: (choiceKey?: string) => void;
  onOverride: (nodeId: string, choiceKey: string, reason: string) => void;
  onLock: () => void;
  sessionStatus: string;
}

export function LiveVoteBoard({
  votes, currentNodeId, choices, isHost, onAdvance, onOverride, onLock, sessionStatus,
}: Props) {
  const [overrideKey, setOverrideKey] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverride, setShowOverride] = useState(false);

  const nodeVotes = votes.filter((v) => v.nodeId === currentNodeId);
  const counts = new Map<string, number>();
  for (const v of nodeVotes) counts.set(v.choiceKey, (counts.get(v.choiceKey) ?? 0) + 1);

  function handleOverrideSubmit() {
    if (!currentNodeId || !overrideKey || !overrideReason.trim()) return;
    onOverride(currentNodeId, overrideKey, overrideReason.trim());
    setShowOverride(false);
    setOverrideKey("");
    setOverrideReason("");
  }

  const isOpen = sessionStatus === "node_open" || sessionStatus === "node_locked";

  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-widest text-op-text-dim/70 mb-2">Vote Board</h3>

      {choices.length === 0 ? (
        <p className="text-xs italic text-op-text-dim">No choices — single advance node.</p>
      ) : (
        <ul className="flex flex-col gap-1 mb-3">
          {choices.map((c) => (
            <li
              key={c.choice}
              className="flex items-center justify-between rounded-sm border border-op-border-bright px-2 py-1 text-xs"
            >
              <span className="text-op-text">{c.label}</span>
              <span className="text-op-accent font-mono">{counts.get(c.choice) ?? 0} vote{counts.get(c.choice) === 1 ? "" : "s"}</span>
            </li>
          ))}
        </ul>
      )}

      {isHost && isOpen && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onAdvance()}
            className="rounded-sm border border-op-accent/50 px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-accent hover:bg-op-accent/10 transition-colors"
          >
            Advance
          </button>
          {sessionStatus === "node_open" && (
            <button
              type="button"
              onClick={onLock}
              className="rounded-sm border border-op-border-bright px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-text-dim hover:border-op-accent/40 hover:text-op-text transition-colors"
            >
              Lock Votes
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowOverride((v) => !v)}
            className="rounded-sm border border-op-danger/40 px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-danger hover:bg-op-danger/10 transition-colors"
          >
            Override
          </button>
        </div>
      )}

      {showOverride && isHost && (
        <div className="mt-3 flex flex-col gap-2 rounded-sm border border-op-danger/30 p-3">
          <p className="text-[10px] uppercase tracking-widest text-op-danger">Host Override — requires reason</p>
          <select
            value={overrideKey}
            onChange={(e) => setOverrideKey(e.target.value)}
            className="op-panel rounded-sm px-2 py-1 text-xs text-op-text focus:outline-none"
          >
            <option value="">Select choice…</option>
            {choices.map((c) => (
              <option key={c.choice} value={c.choice}>{c.label}</option>
            ))}
            {choices.length === 0 && <option value="default">Advance (default)</option>}
          </select>
          <input
            type="text"
            placeholder="Reason for override (required)"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            className="op-panel rounded-sm px-2 py-1 text-xs text-op-text focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!overrideKey || !overrideReason.trim()}
              onClick={handleOverrideSubmit}
              className="rounded-sm border border-op-danger/50 px-3 py-1 text-[11px] uppercase tracking-widest text-op-danger hover:bg-op-danger/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Override
            </button>
            <button
              type="button"
              onClick={() => setShowOverride(false)}
              className="rounded-sm border border-op-border-bright px-3 py-1 text-[11px] uppercase tracking-widest text-op-text-dim"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import type { LiveParticipant, LiveVote } from "../lib/liveSessionService";

interface Props {
  participants: LiveParticipant[];
  votes: LiveVote[];
  currentNodeId: string | null;
}

export function LiveParticipantRoster({ participants, votes, currentNodeId }: Props) {
  const hasVoted = new Set(votes.filter((v) => v.nodeId === currentNodeId).map((v) => v.participantId));

  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-widest text-op-text-dim/70 mb-2">Participants</h3>
      {participants.length === 0 ? (
        <p className="text-xs italic text-op-text-dim">No participants yet — share invite links below.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {participants.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-sm border border-op-border-bright px-2 py-1 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className={p.connected ? "text-op-accent-2" : "text-op-text-dim"}>●</span>
                <span className="text-op-text">{p.name}</span>
                <span className="text-op-text-dim">
                  {p.isHost ? "HOST" : p.isObserver ? "OBS" : p.role}
                </span>
              </div>
              {!p.isObserver && currentNodeId && (
                <span
                  className={
                    hasVoted.has(p.id)
                      ? "text-[10px] text-op-accent-2"
                      : "text-[10px] text-op-text-dim/50"
                  }
                >
                  {hasVoted.has(p.id) ? "voted" : "pending"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

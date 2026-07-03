import { InfoCard } from "./InfoCard";
import type { TtxAnalyticsPacket } from "../lib/ttxTypes";

// Read-only display of one session's execution analytics packet (Phase
// 27) — a small, self-contained InfoCard so TTXPanel's render stays
// readable. Not a chart/dashboard: this is a flat summary of one session,
// matching the "no event store, no list endpoint" scope of the backend.
export function AnalyticsCard({ packet }: { packet: TtxAnalyticsPacket }) {
  return (
    <InfoCard label="Session Analytics" className="mt-3">
      <div className="flex flex-col gap-1.5 text-xs">
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-op-text-dim">
          <span>
            entry: <span className="text-op-text">{packet.entryNode}</span>
          </span>
          <span>
            terminal: <span className="text-op-text">{packet.terminalNode ?? "—"}</span>
          </span>
          <span>
            duration: <span className="text-op-text">{packet.durationMs !== null ? `${packet.durationMs}ms` : "—"}</span>
          </span>
        </div>

        {packet.roleTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-op-text-dim">roles:</span>
            {packet.roleTags.map((role) => (
              <span
                key={role}
                className="rounded-sm border border-op-accent-2/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-op-accent-2"
              >
                {role}
              </span>
            ))}
          </div>
        )}

        {packet.moduleTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-op-text-dim">modules:</span>
            {packet.moduleTags.map((tag) => (
              <span key={tag} className="rounded-sm border border-op-border-bright px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-op-text-dim">
                {tag}
              </span>
            ))}
          </div>
        )}

        {packet.transitions.length > 0 && (
          <div>
            <span className="text-op-text-dim">transitions:</span>
            <ol className="mt-1 flex flex-col gap-0.5">
              {packet.transitions.map((transition, index) => (
                <li key={index} className="text-[11px] text-op-text-dim">
                  {transition.fromNodeId} <span className="text-op-accent">→[{transition.choice}]→</span> {transition.toNodeId}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </InfoCard>
  );
}

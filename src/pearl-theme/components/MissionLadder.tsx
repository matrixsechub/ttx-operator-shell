export type NodeStatus = "done" | "active" | "pending" | "critical";

export interface LadderNode {
  id: string;
  label: string;
  status: NodeStatus;
}

/** Accessible status word (never color-alone). */
const STATUS_WORD: Record<NodeStatus, string> = {
  done: "complete",
  active: "in progress",
  pending: "pending",
  critical: "blocked",
};

const NODE_GLYPH: Record<NodeStatus, string> = {
  done: "✓",
  active: "•",
  pending: "",
  critical: "!",
};

/**
 * MissionLadder — node-status indicator. Status is DERIVED FROM PROPS, never a
 * timer (no auto-cycling demo motion). Each node conveys status via glyph +
 * accessible label + color together, so meaning never depends on color alone.
 * Zero animation this phase.
 */
export function MissionLadder({ nodes, percent }: { nodes: readonly LadderNode[]; percent?: number }) {
  return (
    <section className="pearl-glass-panel" aria-label="Mission progress">
      <div className="pearl-ladder-head">
        <h2 className="pearl-panel-title">Mission Progress</h2>
        {typeof percent === "number" ? <span className="pearl-mono">{Math.round(percent)}%</span> : null}
      </div>
      <ol className="pearl-ladder" role="list">
        {nodes.map((node, i) => (
          <li key={node.id} className="pearl-ladder-item">
            <span
              className={`pearl-node pearl-node--${node.status === "pending" ? "" : node.status}`.trim()}
              aria-label={`${node.label}: ${STATUS_WORD[node.status]}`}
              title={`${node.label} — ${STATUS_WORD[node.status]}`}
            >
              <span aria-hidden="true">{NODE_GLYPH[node.status] || i + 1}</span>
            </span>
            <span className="pearl-node-label pearl-mono">{node.label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

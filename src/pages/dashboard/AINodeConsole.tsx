import { OPERATOR_TOOLS } from "../../lib/tools";

export function AINodeConsole() {
  return (
    <div id="ai-node-console" className="op-panel rounded-sm p-4">
      <h2 className="text-xs uppercase tracking-widest text-op-text-dim">AI Node Console</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {OPERATOR_TOOLS.map((node) => (
          <div key={node} className="flex items-center justify-between rounded-sm border border-op-border-bright px-2.5 py-1.5">
            <span className="text-xs text-op-text">{node}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-op-text-dim/40" />
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] italic text-op-text-dim/70">Node status is not yet wired to live agent sessions.</p>
    </div>
  );
}

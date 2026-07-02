import { StatusPill } from "../../components/StatusPill";

export function AlertSystem() {
  return (
    <div id="alert-system" className="op-panel rounded-sm p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Alert System</h2>
        <StatusPill tone="ok">clear</StatusPill>
      </div>
      <p className="mt-3 text-xs italic text-op-text-dim">No active alerts.</p>
    </div>
  );
}

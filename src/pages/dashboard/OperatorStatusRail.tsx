import { StatusPill } from "../../components/StatusPill";

export function OperatorStatusRail() {
  return (
    <div id="operator-status-rail" className="op-panel flex flex-wrap items-center gap-3 rounded-sm p-4">
      <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Operator Status</h2>
      <StatusPill tone="ok">link established</StatusPill>
      <StatusPill tone="neutral">no active mission</StatusPill>
    </div>
  );
}

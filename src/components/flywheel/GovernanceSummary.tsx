import type { FlywheelRunDetail } from "../../../shared/flywheel/contracts";

export function GovernanceSummary({ detail }: { detail: FlywheelRunDetail | null }) {
  const run = detail?.run;
  const items = [
    ["Beacon", detail?.governance.beaconActive ? "Active" : "Unavailable"],
    ["Risk", run?.riskLevel ?? "—"],
    ["Autonomy", run ? `Level ${run.autonomyLevel}` : "—"],
    ["Approval", detail?.governance.approvalState ?? "—"],
    ["Safe mode", detail?.governance.safeMode ? "Active" : "Inactive"],
  ];
  return <section className="op-panel-raised rounded-sm p-4" aria-labelledby="flywheel-governance-title">
    <h2 id="flywheel-governance-title" className="text-xs font-semibold uppercase tracking-widest text-op-text">Governance</h2>
    <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">{items.map(([label, value]) => <div key={label} className="rounded-sm border border-op-border p-3"><dt className="text-[10px] uppercase text-op-text-dim">{label}</dt><dd className="mt-1 text-sm font-semibold text-op-text">{value}</dd></div>)}</dl>
    {run?.traceId && <p className="mt-3 break-all font-mono text-[10px] text-op-text-dim">Trace {run.traceId}</p>}
  </section>;
}

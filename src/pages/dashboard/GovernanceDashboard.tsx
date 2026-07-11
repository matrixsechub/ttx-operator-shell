import { Link } from "react-router-dom";
import { OperatorShell } from "../../components/OperatorShell";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { ApprovalQueuePanel } from "../../components/ApprovalQueuePanel";
import { GovernanceStatePanel } from "../../components/GovernanceStatePanel";
import { TelemetryFeed } from "./TelemetryFeed";

export function GovernanceDashboard() {
  return (
    <OperatorShell>
      <div className="flex flex-col gap-5">
        <Breadcrumbs trail={[{ label: "Cockpit", to: "/dashboard" }, { label: "Governance" }]} />
        <h1 className="text-lg uppercase tracking-widest text-op-accent">Governance Panel</h1>
        <p className="text-[11px] text-op-text-dim">
          <Link to="/operator/governance" className="text-op-accent hover:underline">
            Open Phase 2B governance console →
          </Link>
        </p>
        <ApprovalQueuePanel />
        <GovernanceStatePanel />
        <TelemetryFeed />
      </div>
    </OperatorShell>
  );
}

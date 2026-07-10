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
        <ApprovalQueuePanel />
        <GovernanceStatePanel />
        <TelemetryFeed />
      </div>
    </OperatorShell>
  );
}

import { OperatorShell } from "../../components/OperatorShell";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { AgentRegistryPanel } from "../../components/AgentRegistryPanel";
import { OrganizerFindingsPanel } from "../../components/OrganizerFindingsPanel";

export function AgentsDashboard() {
  return (
    <OperatorShell>
      <div className="flex flex-col gap-5">
        <Breadcrumbs trail={[{ label: "Cockpit", to: "/dashboard" }, { label: "Agents" }]} />
        <h1 className="text-lg uppercase tracking-widest text-op-accent">Agent Panel</h1>
        <AgentRegistryPanel />
        <OrganizerFindingsPanel />
      </div>
    </OperatorShell>
  );
}

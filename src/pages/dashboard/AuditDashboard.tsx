import { OperatorShell } from "../../components/OperatorShell";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { AuditEventStream } from "../../components/AuditEventStream";

export function AuditDashboard() {
  return (
    <OperatorShell>
      <div className="flex flex-col gap-5">
        <Breadcrumbs trail={[{ label: "Cockpit", to: "/dashboard" }, { label: "Audit" }]} />
        <h1 className="text-lg uppercase tracking-widest text-op-accent">Audit Panel</h1>
        <AuditEventStream />
      </div>
    </OperatorShell>
  );
}

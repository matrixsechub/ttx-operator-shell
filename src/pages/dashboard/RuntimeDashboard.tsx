import { OperatorShell } from "../../components/OperatorShell";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { RuntimePanel } from "../../components/RuntimePanel";

export function RuntimeDashboard() {
  return (
    <OperatorShell>
      <div className="flex flex-col gap-5">
        <Breadcrumbs trail={[{ label: "Cockpit", to: "/dashboard" }, { label: "Runtime" }]} />
        <h1 className="text-lg uppercase tracking-widest text-op-accent">Runtime Panel</h1>
        <RuntimePanel />
      </div>
    </OperatorShell>
  );
}

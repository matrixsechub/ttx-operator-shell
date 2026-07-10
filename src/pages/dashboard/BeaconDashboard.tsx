import { OperatorShell } from "../../components/OperatorShell";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { BeaconPanel } from "../../components/BeaconPanel";

export function BeaconDashboard() {
  return (
    <OperatorShell>
      <div className="flex flex-col gap-5">
        <Breadcrumbs trail={[{ label: "Cockpit", to: "/dashboard" }, { label: "Beacon" }]} />
        <h1 className="text-lg uppercase tracking-widest text-op-accent">Beacon Panel</h1>
        <BeaconPanel />
      </div>
    </OperatorShell>
  );
}

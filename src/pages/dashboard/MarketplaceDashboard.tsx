import { OperatorShell } from "../../components/OperatorShell";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { MarketplaceOverviewPanel } from "../../components/MarketplaceOverviewPanel";

export function MarketplaceDashboard() {
  return (
    <OperatorShell>
      <div className="flex flex-col gap-5">
        <Breadcrumbs trail={[{ label: "Cockpit", to: "/dashboard" }, { label: "Marketplace" }]} />
        <h1 className="text-lg uppercase tracking-widest text-op-accent">Marketplace Panel</h1>
        <MarketplaceOverviewPanel />
      </div>
    </OperatorShell>
  );
}

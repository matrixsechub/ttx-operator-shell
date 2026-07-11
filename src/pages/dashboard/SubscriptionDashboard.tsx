import { OperatorShell } from "../../components/OperatorShell";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { SubscriptionEntitlementPanel } from "../../components/SubscriptionEntitlementPanel";

export function SubscriptionDashboard() {
  return (
    <OperatorShell>
      <div className="flex flex-col gap-5">
        <Breadcrumbs trail={[{ label: "Cockpit", to: "/dashboard" }, { label: "Subscription" }]} />
        <h1 className="text-lg uppercase tracking-widest text-op-accent">Subscription Panel</h1>
        <SubscriptionEntitlementPanel />
      </div>
    </OperatorShell>
  );
}

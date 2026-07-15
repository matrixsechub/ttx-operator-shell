import { OperatorShell } from "../../components/OperatorShell";
import { Breadcrumbs } from "../../components/Breadcrumbs";

/**
 * RECONSTRUCTED PLACEHOLDER — the original SubscriptionDashboard was routed
 * from cockpitRouter but never committed to this branch. Renders an explicit
 * pending panel so the route resolves. Replace with the original
 * implementation when it is recovered.
 */
export function SubscriptionDashboard() {
  return (
    <OperatorShell zone="pearl">
      <div className="flex flex-col gap-5">
        <Breadcrumbs trail={[{ label: "Cockpit", to: "/dashboard" }, { label: "Entitlements" }]} />
        <h1 className="text-lg uppercase tracking-widest text-op-accent">Entitlements</h1>
        <div className="op-panel rounded-sm p-4">
          <p className="text-xs text-op-text-dim">
            Subscription/entitlements module pending restoration — the original surface was not
            committed to this branch.
          </p>
        </div>
      </div>
    </OperatorShell>
  );
}

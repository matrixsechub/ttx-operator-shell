import { OperatorShell } from "../../components/OperatorShell";
import { Breadcrumbs } from "../../components/Breadcrumbs";

/**
 * RECONSTRUCTED PLACEHOLDER — the original TrafficActivationPage was routed
 * from cockpitRouter but never committed to this branch. Renders an explicit
 * pending panel so the route resolves. Replace with the original
 * implementation when it is recovered.
 */
export function TrafficActivationPage() {
  return (
    <OperatorShell>
      <div className="flex flex-col gap-5">
        <Breadcrumbs trail={[{ label: "Cockpit", to: "/dashboard" }, { label: "Traffic Activation" }]} />
        <h1 className="text-lg uppercase tracking-widest text-op-accent">Traffic Activation</h1>
        <div className="op-panel rounded-sm p-4">
          <p className="text-xs text-op-text-dim">
            Traffic activation module pending restoration — the original surface was not committed
            to this branch.
          </p>
        </div>
      </div>
    </OperatorShell>
  );
}

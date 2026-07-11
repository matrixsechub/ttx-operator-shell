import { Link } from "react-router-dom";
import { InfoCard } from "./InfoCard";
import { StatusPill } from "./StatusPill";
import type { SystemStateResponse } from "../lib/types";

export function SafeModePanel({ state }: { state: SystemStateResponse["state"] | null }) {
  const beaconSafe = state?.operatorOs?.beacon.safeMode ?? false;
  const activation = state?.runtimeHealth?.activationSafeMode;
  const policyMode = state?.policy?.mode ?? "standard";

  return (
    <div id="safe-mode-panel" className="op-panel rounded-sm p-4">
      <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Safe-mode indicators</h2>
      <p className="mt-1 text-[11px] text-op-text-dim">
        Read-only aggregation. Operator actions route through the{" "}
        <Link to="/dashboard/governance" className="text-op-accent hover:underline">
          governance approval queue
        </Link>
        .
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <InfoCard label="Beacon integrity">
          <StatusPill tone={beaconSafe ? "danger" : "ok"}>{beaconSafe ? "safe mode" : "verified"}</StatusPill>
          {beaconSafe ? (
            <p className="mt-2 text-[11px] text-op-text-dim">
              Beacon integrity failure prevents worker startup in production.
            </p>
          ) : null}
        </InfoCard>

        <InfoCard label="Activation safe mode">
          <StatusPill tone={activation?.active ? "danger" : "ok"}>
            {activation?.active ? "active" : "clear"}
          </StatusPill>
          {activation?.active && activation.blockers.length > 0 ? (
            <ul className="mt-2 list-disc pl-4 text-[11px] text-op-text-dim">
              {activation.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          ) : null}
        </InfoCard>

        <InfoCard label="Kernel policy">
          <StatusPill tone={policyMode === "RESTRICTIVE" ? "warn" : "ok"}>{policyMode}</StatusPill>
          {state?.policyAdjustments && state.policyAdjustments.length > 0 ? (
            <ul className="mt-2 list-disc pl-4 text-[11px] text-op-text-dim">
              {state.policyAdjustments.map((adj) => (
                <li key={adj}>{adj}</li>
              ))}
            </ul>
          ) : null}
        </InfoCard>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { StatusPill } from "./StatusPill";
import type { SystemStateResponse } from "../lib/types";
import { labelForRuntimeHealth, toneForRuntimeHealth } from "../lib/runtimeHealth";

const DEEP_ROUTES = [
  {
    to: "/dashboard/beacon",
    label: "Beacon",
    description: "Northstar integrity, mandate, and hash",
  },
  {
    to: "/dashboard/runtime",
    label: "Runtime",
    description: "Worker health, latency, and safe-mode state",
  },
  {
    to: "/dashboard/marketplace",
    label: "Marketplace",
    description: "Catalog overview and funnel activity signals",
  },
  {
    to: "/dashboard/agents",
    label: "Agents",
    description: "Codex registry and OrganizerAgent findings",
  },
  {
    to: "/dashboard/governance",
    label: "Governance",
    description: "Approval queue and policy state",
  },
  {
    to: "/dashboard/subscription",
    label: "Subscription",
    description: "Operator OS entitlements and module access",
  },
  {
    to: "/dashboard/audit",
    label: "Audit",
    description: "Immutable governance audit event stream",
  },
] as const;

export function ExecutiveOverviewGrid({ state }: { state: SystemStateResponse["state"] | null }) {
  const runtime = state?.runtimeHealth;
  const pending = state?.operatorOs?.approvals.pending ?? 0;
  const usage = state?.usage;

  return (
    <div id="executive-overview" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <div className="op-panel rounded-sm p-4 sm:col-span-2 xl:col-span-3">
        <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Executive overview</h2>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-op-text">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-op-text-dim">Runtime health</p>
            <div className="mt-1 flex items-center gap-2">
              {runtime ? (
                <StatusPill tone={toneForRuntimeHealth(runtime.state)}>
                  {labelForRuntimeHealth(runtime.state)} · {runtime.score}
                </StatusPill>
              ) : (
                <span className="text-op-text-dim">—</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-op-text-dim">Pending approvals</p>
            <p className="mt-1 font-mono">{pending}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-op-text-dim">Funnel integrity</p>
            <p className="mt-1 font-mono">{usage?.signalIntegrity ?? "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-op-text-dim">Governance mode</p>
            <p className="mt-1 font-mono">{state?.policy?.mode ?? "—"}</p>
          </div>
        </div>
      </div>

      {DEEP_ROUTES.map((route) => (
        <Link
          key={route.to}
          to={route.to}
          className="op-panel rounded-sm p-4 transition-colors hover:border-op-accent/50 hover:bg-op-accent/5"
        >
          <h3 className="text-xs uppercase tracking-widest text-op-accent">{route.label}</h3>
          <p className="mt-2 text-[11px] leading-relaxed text-op-text-dim">{route.description}</p>
          <p className="mt-2 text-[10px] uppercase tracking-widest text-op-accent">open panel →</p>
        </Link>
      ))}
    </div>
  );
}

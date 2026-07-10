import { InfoCard } from "./InfoCard";
import { StatusPill } from "./StatusPill";
import { useApiResource } from "../lib/useApiResource";
import { operatorDashboardService } from "../lib/operatorDashboardService";
import { useAuth } from "../lib/AuthContext";

interface EntitlementRow {
  moduleId: string;
  plan: string;
  status: string;
  validUntil?: string;
}

export function SubscriptionEntitlementPanel() {
  const { operator } = useAuth();
  const systemState = useApiResource(operatorDashboardService.getSystemState, { pollIntervalMs: 20_000 });

  const rows =
    (systemState.result?.ok
      ? (systemState.result.data.state.marketplace?.entitlements as EntitlementRow[] | undefined)
      : undefined) ?? [];

  return (
    <div id="subscription-entitlement-panel" className="flex flex-col gap-4">
      <div className="op-panel rounded-sm border-op-border p-4">
        <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Operator OS entitlements</h2>
        <p className="mt-1 text-[11px] text-op-text-dim">
          Module access validation — not Stripe billing. Display-only operator role labels apply.
        </p>
        {operator ? (
          <p className="mt-2 font-mono text-xs text-op-text">
            {operator.handle}
            {operator.role ? ` · ${operator.role}` : ""}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InfoCard label="Active entitlements">
          <span className="font-mono text-lg">{rows.filter((r) => r.status === "active").length}</span>
        </InfoCard>
        <InfoCard label="Total modules">
          <span className="font-mono text-lg">{rows.length}</span>
        </InfoCard>
      </div>

      <div className="op-panel rounded-sm p-4">
        <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Entitlement records</h2>
        {rows.length === 0 ? (
          <p className="mt-3 text-xs text-op-text-dim">No entitlements seeded for this operator.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {rows.map((row) => (
              <li
                key={`${row.moduleId}-${row.plan}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-op-border px-3 py-2 text-xs"
              >
                <div>
                  <p className="font-mono text-op-text">{row.moduleId}</p>
                  <p className="text-op-text-dim">plan {row.plan}</p>
                </div>
                <StatusPill tone={row.status === "active" ? "ok" : "warn"}>{row.status}</StatusPill>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

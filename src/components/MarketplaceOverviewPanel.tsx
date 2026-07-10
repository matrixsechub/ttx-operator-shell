import { InfoCard } from "./InfoCard";
import { StatusPill } from "./StatusPill";
import { useApiResource } from "../lib/useApiResource";
import { operatorDashboardService } from "../lib/operatorDashboardService";
import { api } from "../lib/apiClient";

export function MarketplaceOverviewPanel() {
  const catalog = useApiResource(operatorDashboardService.getCatalog, { pollIntervalMs: 30_000 });
  const systemState = useApiResource(api.getSystemState, { pollIntervalMs: 15_000 });

  const items = catalog.result?.ok ? catalog.result.data.items : [];
  const usage = systemState.result?.ok ? systemState.result.data.state.usage : null;
  const activeListings = items.filter((item) => item.status !== "draft" && item.status !== "suspended").length;
  const draftListings = items.filter((item) => item.status === "draft").length;

  return (
    <div id="marketplace-overview-panel" className="flex flex-col gap-4">
      <div className="op-panel rounded-sm border-op-amber/30 bg-op-amber/5 p-4">
        <p className="text-xs text-op-text">
          Activity signals only — not a transaction ledger. Validated revenue requires settlement backends not yet
          connected.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard label="Catalog items">
          <span className="font-mono text-lg">{items.length}</span>
        </InfoCard>
        <InfoCard label="Active listings">
          <span className="font-mono text-lg">{activeListings}</span>
        </InfoCard>
        <InfoCard label="Draft listings">
          <span className="font-mono text-lg">{draftListings}</span>
        </InfoCard>
      </div>

      {usage ? (
        <div className="op-panel rounded-sm p-4">
          <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Funnel activity</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <InfoCard label="Visits">
              <span className="font-mono">{usage.visits}</span>
            </InfoCard>
            <InfoCard label="Entry clicks">
              <span className="font-mono">{usage.entryClicks}</span>
            </InfoCard>
            <InfoCard label="Marketplace clicks">
              <span className="font-mono">{usage.marketplaceClicks}</span>
            </InfoCard>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[11px] text-op-text-dim">Signal integrity</span>
            <StatusPill tone={usage.signalIntegrity === "VALID" ? "ok" : "warn"}>
              {usage.signalIntegrity ?? "unknown"}
            </StatusPill>
          </div>
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="op-panel rounded-sm p-4">
          <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Catalog snapshot</h2>
          <ul className="mt-3 space-y-2">
            {items.slice(0, 8).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-op-text">{item.name}</span>
                <span className="shrink-0 font-mono text-op-text-dim">{item.kind ?? "product"}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

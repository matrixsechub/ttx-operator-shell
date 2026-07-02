import { useState } from "react";
import { CatalogGrid } from "../../components/CatalogGrid";
import { CatalogDetailModal } from "../../components/CatalogDetailModal";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { RelatedLinksRail } from "../../components/RelatedLinksRail";
import { api } from "../../lib/apiClient";
import { useApiResource } from "../../lib/useApiResource";
import { getCategoryRelatedSystems } from "../../lib/ecosystem";
import type { CatalogItem } from "../../lib/types";
import type { MarketplaceCategory } from "./categories";

export function CategoryPageBody({ category, showBreadcrumbs = true }: { category: MarketplaceCategory; showBreadcrumbs?: boolean }) {
  const { result, loading, lastFetchedAt, refresh } = useApiResource(api.getCatalog);
  const [selected, setSelected] = useState<CatalogItem | null>(null);

  const matched = result?.ok
    ? result.data.items
        .filter((item) => item.tags?.some((tag) => category.tagMatch.includes(tag.toLowerCase())))
        // TTX Packs only ever surfaces catalog items explicitly flagged as
        // eligible for TTX scenario use — layered on top of the tag match,
        // not instead of it.
        .filter((item) => (category.slug === "ttx-packs" ? item.ttx_eligible === true : true))
    : [];

  return (
    <div className="flex flex-col gap-5">
      {showBreadcrumbs && (
        <Breadcrumbs
          trail={[
            { label: "Cockpit", to: "/dashboard" },
            { label: "Marketplace", to: "/marketplace" },
            { label: category.label },
          ]}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg uppercase tracking-widest text-op-accent">{category.label}</h1>
            {category.kind === "content" && (
              <span className="rounded-sm border border-op-accent-2/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-op-accent-2">
                Content
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-op-text-dim">{category.description}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={() => refresh()}
            className="rounded-sm border border-op-border-bright px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-text-dim hover:border-op-accent/50 hover:text-op-accent"
          >
            {loading ? "syncing…" : "refresh"}
          </button>
          {lastFetchedAt && (
            <span className="text-[10px] text-op-text-dim/60">Last synced: {lastFetchedAt.toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      {!result ? (
        <div className="op-panel rounded-sm p-6 text-center text-xs text-op-text-dim">Loading catalog…</div>
      ) : !result.ok ? (
        <div className="op-panel rounded-sm border-op-danger/40 p-6 text-center text-xs text-op-danger">
          Marketplace catalog unavailable — {result.error}
        </div>
      ) : (
        <CatalogGrid items={matched} onSelect={setSelected} />
      )}

      {selected && <CatalogDetailModal item={selected} onClose={() => setSelected(null)} />}

      <RelatedLinksRail title="Related Operator Systems" links={getCategoryRelatedSystems(category.slug)} />
    </div>
  );
}

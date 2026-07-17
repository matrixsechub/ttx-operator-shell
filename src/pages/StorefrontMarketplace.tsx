import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { StorefrontShell } from "../components/StorefrontShell";
import { CatalogDetailModal } from "../components/CatalogDetailModal";
import { CatalogGrid } from "../components/CatalogGrid";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { EntityVoice } from "../components/EntityVoice";
import { api } from "../lib/apiClient";
import { useApiResource } from "../lib/useApiResource";
import type { CatalogItem } from "../lib/types";
import { MARKETPLACE_CATEGORIES } from "./marketplace/categories";

export function StorefrontMarketplace() {
  const { result, loading, refresh } = useApiResource(api.getCatalog);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CatalogItem | null>(null);

  const items = result?.ok ? result.data.items : [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.tags?.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [items, query]);

  return (
    <StorefrontShell>
      <div className="flex flex-col gap-5">
        <Breadcrumbs trail={[{ label: "Storefront", to: "/marketplace" }, { label: "Marketplace" }]} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg uppercase tracking-widest text-op-accent">Marketplace</h1>
            <p className="mt-1 text-xs text-op-text-dim">Public catalog of items and services.</p>
            <EntityVoice entity="aurelius">browse the governed catalog; nothing here requires an account.</EntityVoice>
          </div>
          <button
            type="button"
            onClick={() => refresh()}
            className="rounded-sm border border-op-border-bright px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-text-dim hover:border-op-accent/50 hover:text-op-accent"
          >
            {loading ? "syncing…" : "refresh"}
          </button>
        </div>

        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="filter by name, tag, or description…"
          className="op-panel w-full max-w-md rounded-sm px-3 py-2 text-sm text-op-text placeholder:text-op-text-dim/60 focus:border-op-accent/60 focus:outline-none"
        />

        <div className="flex flex-wrap gap-1.5">
          {MARKETPLACE_CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              to={`/marketplace/${category.slug}`}
              className="rounded-sm border border-op-border-bright px-2.5 py-1 text-[11px] uppercase tracking-wider text-op-text-dim hover:border-op-accent/50 hover:text-op-accent"
            >
              {category.label}
            </Link>
          ))}
        </div>

        {!result ? (
          <div className="op-panel rounded-sm p-6 text-center text-xs text-op-text-dim">Loading catalog…</div>
        ) : !result.ok ? (
          <div className="op-panel rounded-sm border-op-danger/40 p-6 text-center text-xs text-op-danger">
            Marketplace catalog unavailable — {result.error}
          </div>
        ) : (
          <CatalogGrid items={filtered} onSelect={setSelected} />
        )}
      </div>

      {selected && <CatalogDetailModal item={selected} onClose={() => setSelected(null)} />}
    </StorefrontShell>
  );
}

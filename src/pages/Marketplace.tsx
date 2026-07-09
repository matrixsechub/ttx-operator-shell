import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { OperatorShell } from "../components/OperatorShell";
import { SystemTelemetryPanel } from "../components/SystemTelemetryPanel";
import { CatalogGrid } from "../components/CatalogGrid";
import { SecurityNewsReel } from "../components/SecurityNewsReel";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { api } from "../lib/apiClient";
import { useApiResource } from "../lib/useApiResource";
import { MARKETPLACE_CATEGORIES } from "./marketplace/categories";
import { getDashboardRoute, getMarketplaceCategoryRoute, getOperatorNamespace } from "../lib/operatorRoutes";
import { PublicSurfaceFrame } from "./publicHelpers";
import { useObserverInterest } from "../lib/publicObserver";

export function Marketplace() {
  const { result, loading, refresh } = useApiResource(api.getModules);
  const [query, setQuery] = useState("");
  const location = useLocation();
  const namespace = getOperatorNamespace(location.pathname);
  const { record } = useObserverInterest();
  const isPublicSurface = namespace === "legacy";

  const items = result?.ok ? result.data.modules : [];

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

  const content = (
    <div className="flex flex-col gap-5">
      {!isPublicSurface && (
        <Breadcrumbs trail={[{ label: "Cockpit", to: getDashboardRoute(namespace) }, { label: "Marketplace" }]} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={`uppercase tracking-widest ${isPublicSurface ? "text-2xl text-op-amber sm:text-3xl" : "text-lg text-op-accent"}`}>
            Marketplace
          </h1>
          <p className="mt-1 text-sm text-op-text-dim">
            {isPublicSurface
              ? "Observer-safe marketplace catalog with animated cards, category filters, and cockpit activation prompts."
              : "Catalog of items and services from the engine."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          className={isPublicSurface ? "public-cta public-cta--ghost public-cta--inline" : "rounded-sm border border-op-border-bright px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-text-dim hover:border-op-accent/50 hover:text-op-accent"}
        >
          {loading ? "syncing..." : "refresh"}
        </button>
      </div>

      {isPublicSurface && (
        <article className="public-panel public-panel--alert">
          <span className="public-chip">Observer Mode</span>
          <h2>{record ? "Observer Mode active — readiness request captured." : "You are in Observer Mode — Operator Access Coming Soon."}</h2>
          <p>
            {record
              ? "Your local readiness registration is stored in this browser. Marketplace access remains public while cockpit activation updates are pending."
              : "Browse the public catalog now. Register to receive cockpit activation updates when operator access comes online."}
          </p>
        </article>
      )}

      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="filter by name, tag, or description..."
        className={isPublicSurface ? "public-search" : "op-panel w-full max-w-md rounded-sm px-3 py-2 text-sm text-op-text placeholder:text-op-text-dim/60 focus:border-op-accent/60 focus:outline-none"}
      />

      <div className="flex flex-wrap gap-1.5">
        {MARKETPLACE_CATEGORIES.map((category) => (
          <Link
            key={category.slug}
            to={getMarketplaceCategoryRoute(category.slug, namespace)}
            className={isPublicSurface ? "public-filter-chip" : "rounded-sm border border-op-border-bright px-2.5 py-1 text-[11px] uppercase tracking-wider text-op-text-dim hover:border-op-accent/50 hover:text-op-accent"}
          >
            {category.label}
          </Link>
        ))}
      </div>

      {isPublicSurface && <SecurityNewsReel />}

      {!result ? (
        <div className="op-panel rounded-sm p-6 text-center text-xs text-op-text-dim">Loading catalog...</div>
      ) : !result.ok ? (
        <div className="op-panel rounded-sm border-op-danger/40 p-6 text-center text-xs text-op-danger">
          Marketplace catalog unavailable - {result.error}
        </div>
      ) : (
        <CatalogGrid items={filtered} namespace={namespace} />
      )}
    </div>
  );

  if (isPublicSurface) {
    return (
      <PublicSurfaceFrame
        title="Observer-safe marketplace access with a cinematic storefront pass."
        lead="The marketplace is now public-facing by default: animated category filters, glowing module cards, and clear cockpit activation prompts without requiring operator login."
        actions={
          <>
            <Link to="/paywall" className="public-cta public-cta--primary">
              View Pricing
            </Link>
            <Link
              to="/register"
              title="Register to receive cockpit activation updates."
              className="public-cta public-cta--secondary"
            >
              Register for Updates
            </Link>
          </>
        }
      >
        {content}
      </PublicSurfaceFrame>
    );
  }

  return <OperatorShell telemetry={<SystemTelemetryPanel />}>{content}</OperatorShell>;
}

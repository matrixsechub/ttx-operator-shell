import { useEffect } from "react";
import type { CatalogItem } from "../lib/types";
import { StatusPill } from "./StatusPill";
import { InfoCard } from "./InfoCard";

export function CatalogDetailModal({ item, onClose }: { item: CatalogItem; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="op-panel-raised w-full max-w-lg rounded-sm p-5"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-detail-title"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="catalog-detail-title" className="text-base uppercase tracking-widest text-op-accent">
            {item.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-op-text-dim hover:text-op-text"
            aria-label="Close detail view"
          >
            &times;
          </button>
        </div>

        {item.status && (
          <div className="mt-3">
            <StatusPill tone={item.status.toLowerCase() === "active" ? "ok" : "neutral"}>{item.status}</StatusPill>
          </div>
        )}

        <p className="mt-4 text-sm leading-relaxed text-op-text-dim">
          {item.description || "No description provided."}
        </p>

        {item.tags && item.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-sm border border-op-border-bright px-2 py-0.5 text-[10px] uppercase tracking-wider text-op-text-dim"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {item.price !== undefined && (
          <div className="mt-4 text-sm text-op-accent-2">{item.price}</div>
        )}

        {(item.service_tier || item.access_level || item.deployment_target) && (
          <div className="mt-4 flex flex-col gap-1 text-xs text-op-text-dim">
            {item.service_tier && (
              <div>
                <span className="text-op-text-dim/70">Service tier: </span>
                <span className="text-op-text">{item.service_tier}</span>
              </div>
            )}
            {item.access_level && (
              <div>
                <span className="text-op-text-dim/70">Access level: </span>
                <span className="text-op-text">{item.access_level}</span>
                <span className="ml-1 italic text-op-text-dim/50">(display label only)</span>
              </div>
            )}
            {item.deployment_target && (
              <div>
                <span className="text-op-text-dim/70">Deployment target: </span>
                <span className="text-op-text">{item.deployment_target}</span>
              </div>
            )}
          </div>
        )}

        {item.capabilities && item.capabilities.length > 0 && (
          <div className="mt-4">
            <h3 className="text-[10px] uppercase tracking-widest text-op-text-dim/70">Capabilities</h3>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {item.capabilities.map((capability) => (
                <span
                  key={capability}
                  className="rounded-sm border border-op-accent-2/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-op-accent-2/80"
                >
                  {capability}
                </span>
              ))}
            </div>
          </div>
        )}

        {item.compliance_tags && item.compliance_tags.length > 0 && (
          <div className="mt-4">
            <h3 className="text-[10px] uppercase tracking-widest text-op-text-dim/70">Compliance Metadata</h3>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {item.compliance_tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-sm border border-op-amber/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-op-amber/80"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {(item.source || item.lastUpdated) && (
          <div className="mt-4">
            <InfoCard label={item.source ? "Source" : "Last Updated"}>
              {item.source && <div>{item.source}</div>}
              {item.lastUpdated && <div className={item.source ? "mt-1 text-op-text-dim" : ""}>{item.lastUpdated}</div>}
            </InfoCard>
          </div>
        )}
      </div>
    </div>
  );
}

import { StatusPill } from "./StatusPill";
import type { CatalogItem } from "../lib/types";

export function CatalogGrid({ items, onSelect }: { items: CatalogItem[]; onSelect: (item: CatalogItem) => void }) {
  if (items.length === 0) {
    return <div className="op-panel rounded-sm p-6 text-center text-xs text-op-text-dim">No items match.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item)}
          className="op-panel flex flex-col items-start gap-2 rounded-sm p-4 text-left transition-colors hover:border-op-accent/50 hover:bg-op-accent/5"
        >
          <div className="flex w-full items-start justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm text-op-text">{item.name}</h2>
              {item.kind && (
                <span className="rounded-sm border border-op-border-bright px-1 py-0.5 text-[9px] uppercase tracking-wider text-op-text-dim">
                  {item.kind}
                </span>
              )}
            </div>
            {item.status && (
              <StatusPill tone={item.status.toLowerCase() === "active" ? "ok" : "neutral"}>{item.status}</StatusPill>
            )}
          </div>
          <p className="line-clamp-2 text-xs text-op-text-dim">{item.description}</p>
          {item.tags && item.tags.length > 0 && (
            <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
              {item.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-sm border border-op-border-bright px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-op-text-dim"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

import { Link } from "react-router-dom";

export interface RelatedLink {
  label: string;
  to: string;
}

export function RelatedLinksRail({ title = "Related", links }: { title?: string; links: RelatedLink[] }) {
  if (links.length === 0) {
    return null;
  }

  return (
    <div className="op-panel rounded-sm p-4">
      <h3 className="text-xs uppercase tracking-widest text-op-text-dim">{title}</h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="rounded-sm border border-op-border-bright px-2.5 py-1 text-[11px] uppercase tracking-wider text-op-text-dim transition-colors hover:border-op-accent/50 hover:text-op-accent"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

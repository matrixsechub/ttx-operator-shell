import { Link } from "react-router-dom";

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-widest text-op-text-dim">
      {trail.map((crumb, index) => (
        <span key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
          {index > 0 && <span className="text-op-text-dim/40">/</span>}
          {crumb.to ? (
            <Link to={crumb.to} className="hover:text-op-accent">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-op-text">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

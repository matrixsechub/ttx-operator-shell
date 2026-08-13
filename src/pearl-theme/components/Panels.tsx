import type { ReactNode } from "react";

/** Pearl glass panel — light translucent structure. */
export function GlassPanel({ children, label, className = "" }: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <section className={`pearl-glass-panel ${className}`} aria-label={label}>
      {label ? <h2 className="pearl-panel-title">{label}</h2> : null}
      {children}
    </section>
  );
}

/**
 * GraphitePanel — dark technical/high-density surface hosted on the pearl
 * foundation (the intended composition: light structure, dark instrumentation).
 */
export function GraphitePanel({ children, label, className = "" }: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <section className={`pearl-graphite-panel ${className}`} aria-label={label}>
      {label ? <h2 className="pearl-panel-title pearl-panel-title--graphite">{label}</h2> : null}
      {children}
    </section>
  );
}

import type { ReactNode } from "react";

export function InfoCard({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`op-panel rounded-sm p-4 ${className}`}>
      <h3 className="text-xs uppercase tracking-widest text-op-text-dim">{label}</h3>
      <div className="mt-2 text-sm leading-relaxed text-op-text">{children}</div>
    </div>
  );
}

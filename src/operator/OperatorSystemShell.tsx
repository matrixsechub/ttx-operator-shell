import type { ReactNode } from "react";
import { StatusPill } from "../components/StatusPill";

export function OperatorSystemShell({
  codename,
  description,
  children,
}: {
  codename: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="op-panel rounded-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-op-text-dim">{codename}</span>
        <StatusPill tone="neutral">scaffolded</StatusPill>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-op-text-dim">{description}</p>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

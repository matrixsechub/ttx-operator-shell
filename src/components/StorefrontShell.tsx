import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function StorefrontShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-op-bg text-op-text">
      <header className="border-b border-op-border px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link to="/marketplace" className="text-sm uppercase tracking-widest text-op-accent">
            MSH OPS Storefront
          </Link>
          <Link
            to="/login"
            className="rounded-sm border border-op-border-bright px-2.5 py-1 text-[11px] uppercase tracking-wider text-op-text-dim hover:border-op-accent/50 hover:text-op-accent"
          >
            Operator login
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">{children}</main>
    </div>
  );
}

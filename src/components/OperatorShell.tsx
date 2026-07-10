import { NavLink, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { CommandPalette } from "./CommandPalette";
import { GlobalCommandHeader } from "./GlobalCommandHeader";
import { useAuth } from "../lib/AuthContext";

export const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", glyph: "01" },
  { to: "/dashboard/beacon", label: "Beacon", glyph: "B1" },
  { to: "/dashboard/runtime", label: "Runtime", glyph: "R1" },
  { to: "/dashboard/governance", label: "Governance", glyph: "G1" },
  { to: "/dashboard/agents", label: "Agents", glyph: "A1" },
  { to: "/dashboard/marketplace", label: "Mkt Intel", glyph: "M1" },
  { to: "/dashboard/subscription", label: "Entitlements", glyph: "S1" },
  { to: "/dashboard/audit", label: "Audit", glyph: "AU" },
  { to: "/marketplace", label: "Marketplace", glyph: "02" },
  { to: "/status", label: "Status", glyph: "03" },
  { to: "/about", label: "About", glyph: "04" },
  { to: "/divisions", label: "Divisions", glyph: "05" },
  { to: "/systems", label: "Systems", glyph: "06" },
  { to: "/ttx", label: "TTX SaaS", glyph: "07" },
  { to: "/future", label: "Future", glyph: "08" },
];

export function OperatorShell({
  children,
  telemetry,
  hud,
}: {
  children: ReactNode;
  telemetry?: ReactNode;
  hud?: ReactNode;
}) {
  const { operator, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-op-bg text-op-text">
      <header className="flex shrink-0 items-center justify-between border-b border-op-border px-4 py-2.5 sm:px-6">
        <NavLink to="/" className="flex items-center gap-2 text-sm tracking-[0.25em] text-op-accent">
          <span className="text-base">&#9650;</span>
          MSH&nbsp;OPS
        </NavLink>
        <div className="flex items-center gap-3">
          {operator && (
            <span className="hidden text-[11px] uppercase tracking-widest text-op-text-dim sm:inline">
              operator // {operator.handle}
              {operator.role && <span className="text-op-text-dim/60"> · {operator.role}</span>}
            </span>
          )}
          <span className="hidden rounded-sm border border-op-border-bright px-2 py-1 text-[10px] uppercase tracking-widest text-op-text-dim sm:inline">
            &#8984;K quick nav
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-sm border border-op-border-bright px-2 py-1 text-[10px] uppercase tracking-widest text-op-text-dim transition-colors hover:border-op-danger/50 hover:text-op-danger"
          >
            Logout
          </button>
        </div>
      </header>

      <GlobalCommandHeader />

      {hud ? <div className="shrink-0 border-b border-op-border px-4 py-2 sm:px-6">{hud}</div> : null}

      <CommandPalette />

      <div className="grid min-h-0 flex-1 grid-cols-[auto_1fr] xl:grid-cols-[208px_1fr_320px]">
        <nav className="flex flex-col gap-1 border-r border-op-border p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-sm border px-3 py-2.5 text-xs uppercase tracking-wider transition-colors ${
                  isActive
                    ? "border-op-accent/60 bg-op-accent/10 text-op-accent"
                    : "border-transparent text-op-text-dim hover:border-op-border-bright hover:text-op-text"
                }`
              }
            >
              <span className="font-mono text-[10px] opacity-60">{item.glyph}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <main className="op-scrollbar min-w-0 overflow-y-auto p-4 sm:p-6">{children}</main>

        {telemetry ? (
          <aside className="op-scrollbar hidden overflow-y-auto border-l border-op-border p-4 xl:block">
            {telemetry}
          </aside>
        ) : null}
      </div>
    </div>
  );
}

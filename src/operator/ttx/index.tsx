import { useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { OperatorShell } from "../../components/OperatorShell";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { StatusPill } from "../../components/StatusPill";
import { ScenarioProvider, useScenarioContext } from "./ScenarioContext";
import { ttxService } from "./service";
import { allowedTransitions, targetStatus, transitionLabel, type TTXScenarioTransition } from "./scenarioLifecycle";
import type { TTXScenarioStatus } from "./types";

const TABS = [
  { to: "/ttx/builder", label: "Builder" },
  { to: "/ttx/injects", label: "Injects" },
  { to: "/ttx/timeline", label: "Timeline" },
  { to: "/ttx/roles", label: "Roles" },
  { to: "/ttx/score", label: "Score" },
  { to: "/ttx/packs", label: "Packs" },
];

// Main shell for the MSH TTX SaaS module — MatrixSecHub's tabletop exercise
// product. Mounted at /ttx/* via src/routes/router.tsx as a layout route with
// nested children (see TABS below), so each surface is independently
// deep-linkable and survives the Worker's SPA fallback.
export function TTXShell() {
  return (
    <ScenarioProvider>
      <OperatorShell>
        <div className="flex flex-col gap-5">
          <Breadcrumbs trail={[{ label: "Cockpit", to: "/dashboard" }, { label: "TTX SaaS" }]} />

          <div>
            <h1 className="text-lg uppercase tracking-widest text-op-accent">MSH TTX</h1>
            <p className="mt-1 text-xs text-op-text-dim">Tabletop exercise scenario builder, runtime, and scoring.</p>
            <p className="mt-1 text-[11px] text-op-text-dim">
              Integrated with{" "}
              <Link to="/divisions/operations" className="text-op-accent hover:underline">
                Operations
              </Link>{" "}
              and{" "}
              <Link to="/divisions/engineering" className="text-op-accent hover:underline">
                Engineering
              </Link>
              .
            </p>
          </div>

          <ScenarioPicker />

          <nav className="flex flex-wrap gap-1.5 border-b border-op-border pb-3">
            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `rounded-sm border px-3 py-1.5 text-[11px] uppercase tracking-wider transition-colors ${
                    isActive
                      ? "border-op-accent/60 bg-op-accent/10 text-op-accent"
                      : "border-op-border-bright text-op-text-dim hover:text-op-text"
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>

          <Outlet />
        </div>
      </OperatorShell>
    </ScenarioProvider>
  );
}

const STATUS_TONE: Record<TTXScenarioStatus, "neutral" | "ok" | "warn"> = {
  draft: "neutral",
  published: "ok",
  archived: "warn",
};

function ScenarioPicker() {
  const { scenarios, loading, error, selectedScenarioId, selectScenario, refreshScenarios } = useScenarioContext();
  const [transitioning, setTransitioning] = useState(false);

  const selected = scenarios.find((scenario) => scenario.id === selectedScenarioId);

  async function handleTransition(transition: TTXScenarioTransition) {
    if (!selected) return;
    setTransitioning(true);
    await ttxService.updateScenarioStatus(selected.id, targetStatus(transition));
    refreshScenarios();
    setTransitioning(false);
  }

  return (
    <div className="op-panel flex flex-wrap items-center gap-2 rounded-sm p-3 text-xs">
      <span className="uppercase tracking-widest text-op-text-dim">Active scenario:</span>
      {loading ? (
        <span className="text-op-text-dim">loading…</span>
      ) : error ? (
        <span className="italic text-op-text-dim">none — engine unreachable ({error})</span>
      ) : scenarios.length === 0 ? (
        <span className="italic text-op-text-dim">none saved yet — create one in Builder</span>
      ) : (
        <>
          <select
            value={selectedScenarioId ?? ""}
            onChange={(event) => selectScenario(event.target.value || null)}
            className="op-panel rounded-sm px-2 py-1 text-xs text-op-text focus:border-op-accent/60 focus:outline-none"
          >
            <option value="">Select a scenario…</option>
            {scenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.title}
              </option>
            ))}
          </select>

          {selected && (
            <>
              <StatusPill tone={STATUS_TONE[selected.status]}>{selected.status}</StatusPill>
              {allowedTransitions(selected.status).map((transition) => (
                <button
                  key={transition}
                  type="button"
                  disabled={transitioning}
                  onClick={() => handleTransition(transition)}
                  className="rounded-sm border border-op-border-bright px-2.5 py-1 text-[10px] uppercase tracking-wider text-op-text-dim transition-colors hover:border-op-accent/50 hover:text-op-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {transitioning ? "working…" : transitionLabel(transition)}
                </button>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

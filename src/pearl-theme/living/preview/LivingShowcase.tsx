import { useState } from "react";
import {
  PearlSurface,
  GlassPanel,
  GraphitePanel,
  SecondaryButton,
  EntityOrb,
  MissionLadder,
  StateBadge,
  type EntityId,
  type LadderNode,
  type TelemetryRow,
} from "../../components";
import { LivingRoot, LivingGlassPanel, LivingGoldButton, LivingTelemetryCard } from "../index";

/**
 * LivingShowcase — the controlled surface for the Living Layer. It composes the
 * SAME substrate primitives as the static showcase, now inside <LivingRoot>, so
 * the ambient + responsive motion runs against real components. Data is static;
 * the only value change is user-initiated ("Refresh telemetry"), which is what
 * makes the value heartbeat honest — motion responds to a real change, never a
 * decorative timer. The Mission Ladder status comes only from props (no
 * decorative nominal→warning→critical cycling).
 */

const ENTITIES: EntityId[] = ["beacon", "aurelius", "hsx", "ghost"];

const TELEMETRY_A: TelemetryRow[] = [
  { label: "CPU", value: 32, series: [18, 14, 16, 9, 13, 7, 12, 6, 11, 8, 13, 9] },
  { label: "RAM", value: 61, series: [14, 16, 10, 15, 8, 14, 10, 16, 9, 12, 10] },
  { label: "NET", value: 42, series: [16, 12, 17, 10, 15, 8, 14, 11, 15, 11] },
];
const TELEMETRY_B: TelemetryRow[] = [
  { label: "CPU", value: 47, series: [12, 16, 11, 18, 9, 15, 8, 17, 10, 14, 9, 13] },
  { label: "RAM", value: 58, series: [15, 12, 16, 9, 14, 11, 16, 8, 13, 10, 15] },
  { label: "NET", value: 51, series: [11, 15, 9, 16, 12, 17, 10, 14, 8, 15, 12] },
];

const LADDER: LadderNode[] = [
  { id: "start", label: "Start", status: "done" },
  { id: "diagnose", label: "Diagnose", status: "done" },
  { id: "build", label: "Build", status: "done" },
  { id: "review", label: "Review", status: "active" },
  { id: "deploy", label: "Deploy", status: "pending" },
];

export function LivingShowcase() {
  const [snapshot, setSnapshot] = useState<TelemetryRow[]>(TELEMETRY_A);

  return (
    <LivingRoot>
      <PearlSurface as="main" className="pearl-showcase">
        <header className="pearl-showcase-hero">
          <p className="pearl-eyebrow">AI AGENCY OPERATING SYSTEM · PEARL LIVING LAYER</p>
          <h1 className="pearl-hero-title">
            GOVERNED AUTONOMY. REAL OUTCOMES. <span className="pearl-hero-gold">OPERATOR CONTROL.</span>
          </h1>
          <div className="pearl-cta-row">
            <LivingGoldButton>Start Diagnostic</LivingGoldButton>
            <span data-testid="refresh-telemetry">
              <SecondaryButton
                onClick={() => setSnapshot((s) => (s === TELEMETRY_A ? TELEMETRY_B : TELEMETRY_A))}
              >
                Refresh Telemetry
              </SecondaryButton>
            </span>
          </div>
        </header>

        <section className="pearl-entity-grid" aria-label="Governing entities">
          {ENTITIES.map((e) => (
            <LivingGlassPanel key={e}>
              <EntityOrb entity={e} />
            </LivingGlassPanel>
          ))}
        </section>

        <section className="pearl-ops-grid">
          <LivingTelemetryCard title="Live System Overview" rows={snapshot} />

          <GraphitePanel label="Agent Load">
            <ul className="pearl-load-list">
              {[
                ["COPILOT-DEV", 68],
                ["CLAUDE (BEACON)", 24],
                ["CURSOR", 38],
                ["n8n AUTOMATION", 44],
              ].map(([name, pct]) => (
                <li key={name as string} className="pearl-load-row">
                  <span className="pearl-mono">{name}</span>
                  <span className="pearl-load-bar" aria-hidden="true">
                    <i style={{ width: `${pct}%` }} />
                  </span>
                  <span className="pearl-mono pearl-load-pct">{pct}%</span>
                </li>
              ))}
            </ul>
          </GraphitePanel>

          <GlassPanel label="System State">
            <div className="pearl-badge-row">
              <StateBadge kind="verified">Verified 2,731</StateBadge>
              <StateBadge kind="attention">2 Pending</StateBadge>
              <StateBadge kind="critical">0 Critical</StateBadge>
              <StateBadge kind="info">Nominal</StateBadge>
            </div>
          </GlassPanel>
        </section>

        <section className="pearl-ladder-section">
          <MissionLadder nodes={LADDER} percent={72} />
        </section>

        <footer className="pearl-footer">
          <p className="pearl-mono">GOVERNED AUTONOMY · REAL OUTCOMES · OPERATOR CONTROL — PEARL LIVING LAYER PREVIEW</p>
        </footer>
      </PearlSurface>
    </LivingRoot>
  );
}

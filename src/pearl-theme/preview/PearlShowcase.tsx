import {
  PearlSurface,
  GlassPanel,
  GraphitePanel,
  GoldActionButton,
  SecondaryButton,
  EntityOrb,
  TelemetryCard,
  MissionLadder,
  StateBadge,
  type EntityId,
  type LadderNode,
  type TelemetryRow,
} from "../components";

/**
 * PearlShowcase — the bounded controlled surface demonstrating the Pearl
 * substrate through the real application toolchain. Static data only (no
 * fabricated runtime operational feeds). NO Living Layer animation.
 */

const ENTITIES: EntityId[] = ["beacon", "aurelius", "hsx", "ghost"];

const TELEMETRY: TelemetryRow[] = [
  { label: "CPU", value: 32, series: [18, 14, 16, 9, 13, 7, 12, 6, 11, 8, 13, 9] },
  { label: "RAM", value: 61, series: [14, 16, 10, 15, 8, 14, 10, 16, 9, 12, 10] },
  { label: "NET", value: 42, series: [16, 12, 17, 10, 15, 8, 14, 11, 15, 11] },
];

const LADDER: LadderNode[] = [
  { id: "start", label: "Start", status: "done" },
  { id: "diagnose", label: "Diagnose", status: "done" },
  { id: "build", label: "Build", status: "done" },
  { id: "review", label: "Review", status: "active" },
  { id: "deploy", label: "Deploy", status: "pending" },
];

export function PearlShowcase() {
  return (
    <PearlSurface as="main" className="pearl-showcase">
      <header className="pearl-showcase-hero">
        <p className="pearl-eyebrow">AI AGENCY OPERATING SYSTEM · PEARL SUBSTRATE</p>
        <h1 className="pearl-hero-title">
          GOVERNED AUTONOMY. REAL OUTCOMES. <span className="pearl-hero-gold">OPERATOR CONTROL.</span>
        </h1>
        <div className="pearl-cta-row">
          <GoldActionButton>Start Diagnostic</GoldActionButton>
          <SecondaryButton>Watch Demo</SecondaryButton>
        </div>
      </header>

      <section className="pearl-entity-grid" aria-label="Governing entities">
        {ENTITIES.map((e) => (
          <GlassPanel key={e}>
            <EntityOrb entity={e} />
          </GlassPanel>
        ))}
      </section>

      <section className="pearl-ops-grid">
        <TelemetryCard title="Live System Overview" rows={TELEMETRY} />

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
        <p className="pearl-mono">GOVERNED AUTONOMY · REAL OUTCOMES · OPERATOR CONTROL — PEARL SUBSTRATE PREVIEW</p>
      </footer>
    </PearlSurface>
  );
}

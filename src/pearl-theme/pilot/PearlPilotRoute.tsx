/**
 * PEARL PILOT — authenticated pilot route
 * ---------------------------------------------------------------------------
 * A single bounded, authentication-guarded surface that demonstrates the Pearl
 * substrate + Living Layer inside the real cockpit app, WITHOUT changing the
 * default cockpit experience. It is mounted lazily behind `RequireAuth` and a
 * feature flag that DEFAULTS OFF (see featureFlag.ts).
 *
 * Governance rules honored here:
 *   - flag OFF (default) or unavailable → renders a disabled panel (fail closed);
 *   - NO fabricated telemetry or operational state — every signal with no real
 *     production contract renders an explicit "unavailable (NO_TARGET)" panel;
 *   - SAFE_MODE / BLOCKED / CRITICAL → decorative Living motion is SUSPENDED by
 *     rendering the static substrate (which is complete without motion) instead
 *     of <LivingRoot>; no Living code is modified to achieve this;
 *   - motion never communicates authority or status; state color stays
 *     evidence-backed (and here, absent → shown as unavailable, never invented).
 */

import "../pearl-theme.css";
import "../living/living.css";
import { PearlSurface, GlassPanel, GoldActionButton, EntityOrb, type EntityId } from "../components";
import { LivingRoot } from "../living";
import { isPearlPilotEnabled } from "./featureFlag";
import { motionSuspended, type OperationalCondition } from "./operationalCondition";

const ENTITIES: EntityId[] = ["beacon", "aurelius", "hsx", "ghost"];

/** Explicit NO_TARGET panel — renders an unavailable state, never fabricated data. */
function Unavailable({ label, reason }: { label: string; reason: string }) {
  return (
    <section className="pearl-glass-panel" aria-label={label} role="status">
      <h2 className="pearl-panel-title">{label}</h2>
      <p className="pearl-mono" data-testid="no-target">UNAVAILABLE — {reason}</p>
    </section>
  );
}

/** Fail-closed disabled state shown when the pilot flag is not enabled. */
export function PearlPilotDisabled() {
  return (
    <PearlSurface as="main" className="pearl-showcase">
      <GlassPanel label="Pearl Pilot">
        <p className="pearl-mono" data-testid="pilot-disabled">
          Pearl pilot is not enabled. Enable the governed feature flag to preview this surface.
        </p>
      </GlassPanel>
    </PearlSurface>
  );
}

/** The static Pearl composition (identity + governance action + NO_TARGET data). */
function PilotComposition() {
  return (
    <PearlSurface as="main" className="pearl-showcase">
      <header className="pearl-showcase-hero">
        <p className="pearl-eyebrow">OPERATOR COCKPIT · PEARL PILOT</p>
        <h1 className="pearl-hero-title">
          GOVERNED AUTONOMY. <span className="pearl-hero-gold">OPERATOR CONTROL.</span>
        </h1>
        <div className="pearl-cta-row">
          <GoldActionButton>Acknowledge</GoldActionButton>
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
        <Unavailable label="Live System Overview" reason="no production telemetry contract (NO_TARGET)" />
        <Unavailable label="Mission Progress" reason="no production mission-stage contract (NO_TARGET)" />
        <Unavailable label="System State" reason="pilot does not wire live governance state (NO_TARGET)" />
      </section>
    </PearlSurface>
  );
}

/**
 * Pilot route. `condition` defaults to NOMINAL (no adverse condition asserted —
 * a neutral default, not fabricated live state; a production integration feeds
 * the real governance systemMode here).
 */
export function PearlPilotRoute({ condition = "NOMINAL" }: { condition?: OperationalCondition }) {
  if (!isPearlPilotEnabled()) return <PearlPilotDisabled />;

  const composition = <PilotComposition />;

  // Adverse governance condition → suspend decorative motion by rendering the
  // static substrate (complete without Living) instead of <LivingRoot>.
  if (motionSuspended(condition)) {
    return (
      <div data-testid="pilot-motion-suspended" data-condition={condition}>
        {composition}
      </div>
    );
  }

  return <LivingRoot>{composition}</LivingRoot>;
}

export default PearlPilotRoute;

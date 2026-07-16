import type { ReactNode } from "react";

/**
 * Pearl-Spectral entity voice cue (Track 3 OS-wide conformance).
 *
 * Renders the same presentational `.entity-voice` strip the static funnel
 * surfaces use (styles: public/styles/entity-cues.css, tokens:
 * public/styles/entity-tokens.css — both linked by every Vite shell).
 * Purely presentational: tells the operator which governing entity speaks
 * on a surface. Never carries logic.
 *
 * Surface → entity assignments are documented in SURFACE-IDENTITY-MAP.md;
 * the brand-conformance lint checks key surfaces render a cue.
 */
export type EntityName = "beacon" | "aurelius" | "hsx" | "ghost" | "operator";

const ENTITY_ROLE: Record<EntityName, string> = {
  beacon: "Governs",
  aurelius: "Interprets",
  hsx: "Trains & protects",
  ghost: "Evolves & adapts",
  operator: "Decides",
};

export function EntityVoice({ entity, children }: { entity: EntityName; children?: ReactNode }) {
  return (
    <p className="entity-voice" data-entity={entity}>
      <span className="entity-voice-orb" aria-hidden="true" />
      <strong>{entity.toUpperCase()}</strong>
      <span>
        {ENTITY_ROLE[entity]}
        {children ? <> — {children}</> : null}
      </span>
    </p>
  );
}

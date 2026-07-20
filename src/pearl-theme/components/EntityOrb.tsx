export type EntityId = "beacon" | "aurelius" | "hsx" | "ghost";

const ENTITY_META: Record<EntityId, { name: string; role: string }> = {
  beacon: { name: "BEACON", role: "Governance Northstar" },
  aurelius: { name: "AURELIUS", role: "Interprets Intent" },
  hsx: { name: "HSX", role: "Trains & Protects" },
  ghost: { name: "GHOST LAYER", role: "Evolves & Adapts" },
};

/**
 * EntityOrb — static sigil surface for a governing entity. The visual is a
 * decorative gradient (the ::after ring is inert + pointer-events:none via
 * CSS). Identity meaning is carried in text (name + role), never by the orb
 * alone. No motion in this phase — the Living Layer will later target
 * `.pearl-orb--<id>` without markup changes.
 */
export function EntityOrb({ entity }: { entity: EntityId }) {
  const meta = ENTITY_META[entity];
  return (
    <figure className="pearl-entity">
      <div className={`pearl-orb pearl-orb--${entity}`} aria-hidden="true" />
      <figcaption>
        <span className="pearl-entity-name">{meta.name}</span>
        <span className="pearl-entity-role">{meta.role}</span>
      </figcaption>
    </figure>
  );
}

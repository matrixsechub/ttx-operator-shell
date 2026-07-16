/**
 * PEARL-SPECTRAL — ONBOARDING CHECKLIST PRIMITIVES (live since Track 5)
 * ---------------------------------------------------------------------------
 * Presentational primitives for the activation checklist (reference
 * board frame ⑤ — Account Created → Profile Setup → Mission Diagnostic →
 * System Blueprint → Access Granted), live in the onboarding wizard
 * since Track 5. Item status stays caller-supplied — derivation belongs
 * to the qualification runtime, not the rendering layer.
 *
 * Token discipline: op-* / entity-* utilities only (brand lint R9–R11).
 */

export type ChecklistItemStatus = "complete" | "active" | "pending";

export interface ChecklistItemDef {
  id: string;
  label: string;
  status: ChecklistItemStatus;
  note?: string;
}

const STATUS_GLYPH: Record<ChecklistItemStatus, string> = {
  complete: "[x]",
  active: "[~]",
  pending: "[ ]",
};

function itemTone(status: ChecklistItemStatus): string {
  if (status === "complete") return "text-entity-aurelius";
  if (status === "active") return "text-entity-ghost";
  return "text-op-text-dim";
}

/** One checklist row. */
export function ChecklistItem({ item }: { item: ChecklistItemDef }) {
  return (
    <li className={`flex items-baseline gap-3 text-sm ${itemTone(item.status)}`}>
      <span className="font-mono text-[11px]" aria-hidden="true">
        {STATUS_GLYPH[item.status]}
      </span>
      <span>
        {item.label}
        {item.note ? <span className="ml-2 text-[11px] uppercase tracking-wider">{item.note}</span> : null}
      </span>
    </li>
  );
}

/** Overall progress bar (percentage supplied by the caller). */
export function ChecklistProgress({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div aria-label={`Overall progress ${clamped}%`}>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-op-text-dim">
        <span>Overall progress</span>
        <span>{clamped}%</span>
      </div>
      <div className="mt-1 h-1.5 rounded-sm bg-op-border">
        <div className="h-full rounded-sm bg-entity-ghost" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

/** Full activation checklist panel. */
export function ActivationChecklist({ items, percent }: { items: readonly ChecklistItemDef[]; percent: number }) {
  return (
    <section className="op-panel flex flex-col gap-4 rounded-sm p-6">
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <ChecklistItem key={item.id} item={item} />
        ))}
      </ul>
      <ChecklistProgress percent={percent} />
    </section>
  );
}

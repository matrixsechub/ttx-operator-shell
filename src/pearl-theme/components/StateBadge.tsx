import type { ReactNode } from "react";

export type StateKind = "verified" | "attention" | "critical" | "info";

const STATE_META: Record<StateKind, { glyph: string; word: string }> = {
  verified: { glyph: "✓", word: "Verified" },
  attention: { glyph: "◐", word: "Attention" },
  critical: { glyph: "!", word: "Critical" },
  info: { glyph: "i", word: "Info" },
};

/**
 * StateBadge — evidence-backed state indicator. Meaning is carried by icon +
 * text label + color TOGETHER (never color alone). Emerald/red here are STATE
 * colors from the state token block, never decorative atmosphere.
 */
export function StateBadge({ kind, children }: { kind: StateKind; children?: ReactNode }) {
  const meta = STATE_META[kind];
  return (
    <span className={`pearl-badge pearl-badge--${kind}`}>
      <span aria-hidden="true">{meta.glyph}</span>
      <span>{children ?? meta.word}</span>
    </span>
  );
}

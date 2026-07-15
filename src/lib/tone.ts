/* Accent tones resolve through Pearl Spectral state tokens where the tone
   carries meaning (active intelligence, attention); pure brand accents stay
   on op tokens. */
export type Tone = "accent" | "accent-2" | "magenta" | "amber";

export const TONE_TEXT: Record<Tone, string> = {
  accent: "text-state-active",
  "accent-2": "text-op-accent-2",
  magenta: "text-op-magenta",
  amber: "text-state-warning",
};

export const TONE_BORDER: Record<Tone, string> = {
  accent: "border-state-active/40",
  "accent-2": "border-op-accent-2/40",
  magenta: "border-op-magenta/40",
  amber: "border-state-warning/40",
};

export const TONE_BG: Record<Tone, string> = {
  accent: "bg-state-active/10",
  "accent-2": "bg-op-accent-2/10",
  magenta: "bg-op-magenta/10",
  amber: "bg-state-warning/10",
};

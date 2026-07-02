export type Tone = "accent" | "accent-2" | "magenta" | "amber";

export const TONE_TEXT: Record<Tone, string> = {
  accent: "text-op-accent",
  "accent-2": "text-op-accent-2",
  magenta: "text-op-magenta",
  amber: "text-op-amber",
};

export const TONE_BORDER: Record<Tone, string> = {
  accent: "border-op-accent/40",
  "accent-2": "border-op-accent-2/40",
  magenta: "border-op-magenta/40",
  amber: "border-op-amber/40",
};

export const TONE_BG: Record<Tone, string> = {
  accent: "bg-op-accent/10",
  "accent-2": "bg-op-accent-2/10",
  magenta: "bg-op-magenta/10",
  amber: "bg-op-amber/10",
};

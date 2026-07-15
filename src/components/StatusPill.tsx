/* Tones resolve through the Pearl Spectral state tokens (--color-state-*),
   re-inked per zone. Doctrine: "verified" (green) is for validated evidence
   only; "ok" means active/engaged, not success; "blocked" is impedance,
   distinct from real failure ("danger"). */
type Tone = "ok" | "verified" | "warn" | "danger" | "blocked" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  ok: "border-state-active/50 text-state-active bg-state-active/10",
  verified: "border-state-verified/50 text-state-verified bg-state-verified/10",
  warn: "border-state-warning/50 text-state-warning bg-state-warning/10",
  danger: "border-state-critical/50 text-state-critical bg-state-critical/10",
  blocked: "border-state-blocked/50 text-state-blocked bg-state-blocked/10",
  neutral: "border-op-border-bright text-state-neutral bg-white/5",
};

export function StatusPill({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] uppercase tracking-wider ${TONE_CLASSES[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-glow" />
      {children}
    </span>
  );
}

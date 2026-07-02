type Tone = "ok" | "warn" | "danger" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  ok: "border-op-accent/50 text-op-accent bg-op-accent/10",
  warn: "border-op-amber/50 text-op-amber bg-op-amber/10",
  danger: "border-op-danger/50 text-op-danger bg-op-danger/10",
  neutral: "border-op-border-bright text-op-text-dim bg-white/5",
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

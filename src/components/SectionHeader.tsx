import { TONE_BORDER, TONE_TEXT, type Tone } from "../lib/tone";

export function SectionHeader({
  index,
  tone,
  title,
  subtitle,
}: {
  index: string;
  tone: Tone;
  title: string;
  subtitle: string;
}) {
  return (
    <div className={`flex items-center gap-3 border-b pb-2 ${TONE_BORDER[tone]}`}>
      <span className={`font-mono text-xs ${TONE_TEXT[tone]}`}>{index}</span>
      <div>
        <h2 className={`text-sm uppercase tracking-widest ${TONE_TEXT[tone]}`}>{title}</h2>
        <p className="text-[11px] text-op-text-dim">{subtitle}</p>
      </div>
    </div>
  );
}

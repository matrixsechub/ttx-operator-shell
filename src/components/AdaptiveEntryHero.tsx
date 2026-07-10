import { Link } from "react-router-dom";
import { getAdaptiveEntryCopy, type AdaptiveEntryUiMode } from "../lib/adaptiveEntry";
import { recordUsageEvent } from "../lib/usageBeacon";

interface AdaptiveEntryHeroProps {
  uiMode: AdaptiveEntryUiMode;
}

function ctaClassName(isPrimary: boolean, uiMode: AdaptiveEntryUiMode): string {
  const base = "rounded-sm px-8 py-3 text-sm uppercase tracking-[0.25em] transition-colors";
  if (!isPrimary) {
    return `${base} border border-op-accent-2/40 text-op-accent-2 hover:bg-op-accent-2/10`;
  }
  if (uiMode === "FRICTION") {
    return `${base} border border-op-accent-2/70 bg-op-accent-2/10 text-op-accent-2 hover:bg-op-accent-2/20`;
  }
  if (uiMode === "ENGAGED") {
    return `${base} border border-op-accent bg-op-accent/15 text-op-accent hover:bg-op-accent/25`;
  }
  return `${base} border border-op-accent/60 text-op-accent hover:bg-op-accent/10`;
}

export function AdaptiveEntryHero({ uiMode }: AdaptiveEntryHeroProps) {
  const copy = getAdaptiveEntryCopy(uiMode);

  return (
    <header className="relative border-b border-op-accent/15 px-6 py-10 text-center sm:px-10">
      <span className="text-[11px] uppercase tracking-[0.4em] text-op-text-dim">{copy.eyebrow}</span>
      <h1 className="mt-4 text-3xl font-semibold tracking-[0.14em] text-op-accent sm:text-5xl">{copy.title}</h1>
      <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-op-text-dim">{copy.subtitle}</p>
      {copy.helper ? (
        <p className="mx-auto mt-3 max-w-xl text-xs leading-relaxed text-op-text-dim/90">{copy.helper}</p>
      ) : null}
      {copy.trustSignal ? (
        <p className="mx-auto mt-3 max-w-xl rounded-sm border border-op-accent-2/25 bg-op-accent-2/5 px-4 py-2 text-xs leading-relaxed text-op-accent-2/90">
          {copy.trustSignal}
        </p>
      ) : null}
      {copy.progression ? (
        <p className="mx-auto mt-3 max-w-xl text-[11px] uppercase tracking-[0.2em] text-op-accent/80">{copy.progression}</p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          to={copy.primaryCta.to}
          onClick={() => recordUsageEvent(copy.primaryCta.event, { uiMode })}
          className={ctaClassName(true, uiMode)}
        >
          {copy.primaryCta.label}
        </Link>
        {copy.secondaryCta ? (
          <Link
            to={copy.secondaryCta.to}
            onClick={() => {
              const secondary = copy.secondaryCta;
              if (secondary) recordUsageEvent(secondary.event, { uiMode });
            }}
            className={ctaClassName(false, uiMode)}
          >
            {copy.secondaryCta.label}
          </Link>
        ) : null}
      </div>
    </header>
  );
}

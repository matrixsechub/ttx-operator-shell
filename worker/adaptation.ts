import type { UsageContextEnv } from "./usage";
import { readModeCounters } from "./usageModeMetrics";

export interface ModeAdaptationRates {
  views: number;
  entryRate: number;
  marketplaceRate: number;
  dropOffRate: number;
}

export interface EngagedModeAdaptationRates extends ModeAdaptationRates {
  conversionSignal: number;
}

export interface AdaptationFeedback {
  modes: {
    CONFUSION: ModeAdaptationRates;
    FRICTION: ModeAdaptationRates;
    ENGAGED: EngagedModeAdaptationRates;
    DEFAULT: ModeAdaptationRates;
  };
  updatedAt: string;
}

function roundRate(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function computeModeRates(views: number, entryClicks: number, marketplaceClicks: number): ModeAdaptationRates {
  if (views <= 0) {
    return { views: 0, entryRate: 0, marketplaceRate: 0, dropOffRate: 0 };
  }

  const entryRate = Math.min(1, entryClicks / views);
  const marketplaceRate = Math.min(1, marketplaceClicks / views);

  return {
    views,
    entryRate: roundRate(entryRate),
    marketplaceRate: roundRate(marketplaceRate),
    dropOffRate: roundRate(1 - entryRate),
  };
}

function computeConversionSignal(entryRate: number, marketplaceRate: number): number {
  return roundRate((entryRate + marketplaceRate) / 2);
}

export async function buildAdaptationFeedback(env: UsageContextEnv): Promise<AdaptationFeedback> {
  const counters = await readModeCounters(env);

  const confusion = computeModeRates(
    counters.CONFUSION.views,
    counters.CONFUSION.entryClicks,
    counters.CONFUSION.marketplaceClicks,
  );
  const friction = computeModeRates(
    counters.FRICTION.views,
    counters.FRICTION.entryClicks,
    counters.FRICTION.marketplaceClicks,
  );
  const engagedBase = computeModeRates(
    counters.ENGAGED.views,
    counters.ENGAGED.entryClicks,
    counters.ENGAGED.marketplaceClicks,
  );
  const defaultMode = computeModeRates(
    counters.DEFAULT.views,
    counters.DEFAULT.entryClicks,
    counters.DEFAULT.marketplaceClicks,
  );

  return {
    modes: {
      CONFUSION: confusion,
      FRICTION: friction,
      ENGAGED: {
        ...engagedBase,
        conversionSignal: computeConversionSignal(engagedBase.entryRate, engagedBase.marketplaceRate),
      },
      DEFAULT: defaultMode,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function emptyAdaptationFeedback(): AdaptationFeedback {
  const zero = { views: 0, entryRate: 0, marketplaceRate: 0, dropOffRate: 0 };
  return {
    modes: {
      CONFUSION: zero,
      FRICTION: zero,
      ENGAGED: { ...zero, conversionSignal: 0 },
      DEFAULT: zero,
    },
    updatedAt: new Date().toISOString(),
  };
}

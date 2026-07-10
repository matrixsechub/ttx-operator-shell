import type { BehaviorIntelligence } from "./behaviorIntelligence";
import type { AdaptiveUiMode } from "./usageModeMetrics";

const ENTRY_RATE_THRESHOLD = 0.3;

export function resolveBehaviorDrivenUiMode(behavior: BehaviorIntelligence): AdaptiveUiMode {
  if (behavior.systemState !== "LEARNING_ACTIVE") {
    return "DEFAULT";
  }

  const { entryRate, marketplaceRate } = behavior.metrics;

  if (marketplaceRate >= ENTRY_RATE_THRESHOLD) {
    return "ENGAGED";
  }
  if (entryRate >= ENTRY_RATE_THRESHOLD) {
    return "FRICTION";
  }
  return "CONFUSION";
}

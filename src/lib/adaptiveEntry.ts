import type { BehaviorIntelligenceSnapshot } from "./types";

export type AdaptiveEntryUiMode = "CONFUSION" | "FRICTION" | "ENGAGED" | "DEFAULT";

export const ADAPTIVE_ENTRY_RATE_THRESHOLD = 0.3;

export function resolveAdaptiveEntryMode(
  behavior: BehaviorIntelligenceSnapshot | null | undefined,
): AdaptiveEntryUiMode {
  if (!behavior || behavior.systemState !== "LEARNING_ACTIVE") {
    return "DEFAULT";
  }

  const { entryRate, marketplaceRate } = behavior.metrics;

  if (marketplaceRate >= ADAPTIVE_ENTRY_RATE_THRESHOLD) {
    return "ENGAGED";
  }
  if (entryRate >= ADAPTIVE_ENTRY_RATE_THRESHOLD) {
    return "FRICTION";
  }
  return "CONFUSION";
}

export function resolveAdaptiveEntryModeFromClass(
  behaviorClass: string | null | undefined,
): AdaptiveEntryUiMode | null {
  switch (behaviorClass) {
    case "CONFUSION_AT_ENTRY":
      return "CONFUSION";
    case "INTEREST_NO_COMMIT":
      return "FRICTION";
    case "ACTIVE_EXPLORATION":
      return "ENGAGED";
    default:
      return null;
  }
}

/** Rate-based mode with behavior_class as a consistency check when both are present. */
export function resolveAdaptiveEntryUiMode(
  behavior: BehaviorIntelligenceSnapshot | null | undefined,
): AdaptiveEntryUiMode {
  const fromRates = resolveAdaptiveEntryMode(behavior);
  if (fromRates === "DEFAULT") return "DEFAULT";

  const fromClass = resolveAdaptiveEntryModeFromClass(behavior?.behaviorClass);
  if (fromClass && fromClass !== fromRates) {
    return fromRates;
  }

  return fromRates;
}

export interface AdaptiveEntryCopy {
  eyebrow: string;
  title: string;
  subtitle: string;
  helper?: string;
  trustSignal?: string;
  progression?: string;
  primaryCta: { label: string; to: string; event: "entry_click" | "marketplace_click" };
  secondaryCta?: { label: string; to: string; event: "entry_click" | "marketplace_click" };
}

export function getAdaptiveEntryCopy(mode: AdaptiveEntryUiMode): AdaptiveEntryCopy {
  switch (mode) {
    case "CONFUSION":
      return {
        eyebrow: "MatrixSecHub // Operator OS",
        title: "Operator Entry",
        subtitle: "One secure surface for missions, systems, and marketplace modules.",
        helper: "Tap below to open the operator cockpit — no account needed to browse.",
        primaryCta: { label: "Enter System", to: "/enter", event: "entry_click" },
      };
    case "FRICTION":
      return {
        eyebrow: "MatrixSecHub // Operator OS",
        title: "Ecosystem Entry",
        subtitle: "Browse public marketplace modules, then enter when you are ready to operate.",
        trustSignal: "Catalog includes mission packs, TTX scenarios, and operator tooling previews.",
        primaryCta: { label: "Explore Marketplace", to: "/marketplace", event: "marketplace_click" },
        secondaryCta: { label: "Enter System", to: "/enter", event: "entry_click" },
      };
    case "ENGAGED":
      return {
        eyebrow: "MatrixSecHub // Operator OS",
        title: "You Are Cleared",
        subtitle: "Operators like you are exploring modules — pick up where the graph left off.",
        progression: "Next step: start a session or drill into a marketplace lane.",
        primaryCta: { label: "Start Session", to: "/enter", event: "entry_click" },
        secondaryCta: { label: "Explore Modules", to: "/marketplace", event: "marketplace_click" },
      };
    case "DEFAULT":
      return {
        eyebrow: "MatrixSecHub // Operator OS",
        title: "Ecosystem Entry",
        subtitle:
          "Unified operator surface — divisions, agents, systems, and marketplace modules wired into one MatrixSecHub deployment graph.",
        primaryCta: { label: "Enter System", to: "/enter", event: "entry_click" },
        secondaryCta: { label: "Explore Marketplace", to: "/marketplace", event: "marketplace_click" },
      };
    default: {
      const _exhaustive: never = mode;
      void _exhaustive;
      return getAdaptiveEntryCopy("DEFAULT");
    }
  }
}

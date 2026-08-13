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
        eyebrow: "Pearl OS // Governed AI Operations",
        title: "Pearl OS",
        subtitle: "The governed operating system for AI agents. Bounded autonomy, evidence-first execution, fail-closed gates.",
        helper: "Browse the marketplace below or enter the operator cockpit.",
        primaryCta: { label: "Explore Pearl OS", to: "/marketplace", event: "marketplace_click" },
      };
    case "FRICTION":
      return {
        eyebrow: "Pearl OS // Governed AI Operations",
        title: "Pearl OS Marketplace",
        subtitle: "Templates, automation kits, and operator tooling for teams that ship governed AI.",
        trustSignal: "Every product built in production. Governance diagrams, n8n workflows, and spec systems.",
        primaryCta: { label: "Browse Products", to: "/marketplace", event: "marketplace_click" },
        secondaryCta: { label: "Enter Cockpit", to: "/enter", event: "entry_click" },
      };
    case "ENGAGED":
      return {
        eyebrow: "Pearl OS // Governed AI Operations",
        title: "Welcome Back",
        subtitle: "Pick up where you left off. Your operator surface is ready.",
        progression: "Next: start a mission or explore new marketplace modules.",
        primaryCta: { label: "Start Session", to: "/enter", event: "entry_click" },
        secondaryCta: { label: "Browse Marketplace", to: "/marketplace", event: "marketplace_click" },
      };
    case "DEFAULT":
      return {
        eyebrow: "Pearl OS // Governed AI Operations",
        title: "Pearl OS",
        subtitle:
          "The governed operating system for AI agents. Agent-native process management, bounded autonomy, and cryptographic evidence trails.",
        primaryCta: { label: "Explore Pearl OS", to: "/marketplace", event: "marketplace_click" },
        secondaryCta: { label: "Enter Cockpit", to: "/enter", event: "entry_click" },
      };
    default: {
      const _exhaustive: never = mode;
      void _exhaustive;
      return getAdaptiveEntryCopy("DEFAULT");
    }
  }
}

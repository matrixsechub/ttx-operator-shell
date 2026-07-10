import { assessSignalIntegrity, type UsageSummary } from "./usage";
import type { GovernanceProposalPriority } from "./governanceAutomation";

export const BEHAVIOR_RATE_THRESHOLD = 0.3;
export const BEHAVIOR_LEARNING_MIN_VISITS = 3;

export type BehaviorClass = "CONFUSION_AT_ENTRY" | "INTEREST_NO_COMMIT" | "ACTIVE_EXPLORATION";

export type BehaviorSystemState = "LEARNING_ACTIVE" | "SIGNAL_WEAK" | "NOISE" | "SIGNAL_INVALID";

export type BehaviorGovernanceProposalType =
  | "improve_entry_clarity"
  | "optimize_marketplace_conversion"
  | "increase_capture_points";

export interface BehaviorMetrics {
  entryRate: number;
  marketplaceRate: number;
  dropOffRate: number;
}

export interface BehaviorGovernanceProposal {
  id: BehaviorGovernanceProposalType;
  type: BehaviorGovernanceProposalType;
  reason: string;
  priority: GovernanceProposalPriority;
  advisory: true;
  source: "behavior";
}

export interface BehaviorIntelligence {
  metrics: BehaviorMetrics;
  behaviorClass: BehaviorClass | null;
  governanceProposals: BehaviorGovernanceProposal[];
  systemState: BehaviorSystemState;
}

function roundRate(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function computeBehaviorMetrics(usage: Pick<UsageSummary, "visits" | "entryClicks" | "marketplaceClicks">): BehaviorMetrics {
  const visits = usage.visits;
  if (visits <= 0) {
    return { entryRate: 0, marketplaceRate: 0, dropOffRate: 0 };
  }

  const entryRate = Math.min(1, usage.entryClicks / visits);
  const marketplaceRate = Math.min(1, usage.marketplaceClicks / visits);

  return {
    entryRate: roundRate(entryRate),
    marketplaceRate: roundRate(marketplaceRate),
    dropOffRate: roundRate(1 - entryRate),
  };
}

export function resolveBehaviorSystemState(
  usage: Pick<UsageSummary, "visits" | "entryClicks" | "marketplaceClicks" | "signalIntegrity">,
): BehaviorSystemState {
  if (usage.visits === 0) return "NOISE";
  if (assessSignalIntegrity(usage) === "INVALID_RATIOS" || usage.signalIntegrity === "INVALID_RATIOS") {
    return "SIGNAL_INVALID";
  }
  if (usage.visits < BEHAVIOR_LEARNING_MIN_VISITS) return "SIGNAL_WEAK";
  return "LEARNING_ACTIVE";
}

export function classifyUserBehavior(metrics: BehaviorMetrics): BehaviorClass {
  if (metrics.marketplaceRate >= BEHAVIOR_RATE_THRESHOLD) {
    return "ACTIVE_EXPLORATION";
  }
  if (metrics.entryRate < BEHAVIOR_RATE_THRESHOLD) {
    return "CONFUSION_AT_ENTRY";
  }
  return "INTEREST_NO_COMMIT";
}

export function generateBehaviorGovernanceProposals(
  behaviorClass: BehaviorClass,
): BehaviorGovernanceProposal[] {
  switch (behaviorClass) {
    case "CONFUSION_AT_ENTRY":
      return [
        {
          id: "improve_entry_clarity",
          type: "improve_entry_clarity",
          reason: "users not understanding entry",
          priority: "high",
          advisory: true,
          source: "behavior",
        },
      ];
    case "INTEREST_NO_COMMIT":
      return [
        {
          id: "optimize_marketplace_conversion",
          type: "optimize_marketplace_conversion",
          reason: "users clicking but not progressing",
          priority: "medium",
          advisory: true,
          source: "behavior",
        },
      ];
    case "ACTIVE_EXPLORATION":
      return [
        {
          id: "increase_capture_points",
          type: "increase_capture_points",
          reason: "users engaged, monetize or capture",
          priority: "medium",
          advisory: true,
          source: "behavior",
        },
      ];
    default: {
      const _exhaustive: never = behaviorClass;
      void _exhaustive;
      return [];
    }
  }
}

export function analyzeBehaviorIntelligence(usage: UsageSummary): BehaviorIntelligence {
  const metrics = computeBehaviorMetrics(usage);
  const systemState = resolveBehaviorSystemState(usage);
  const behaviorClass = systemState === "LEARNING_ACTIVE" ? classifyUserBehavior(metrics) : null;
  const governanceProposals = behaviorClass === null ? [] : generateBehaviorGovernanceProposals(behaviorClass);

  return {
    metrics,
    behaviorClass,
    governanceProposals,
    systemState,
  };
}

export function formatBehaviorIntelligenceReport(intelligence: BehaviorIntelligence): string {
  return [
    "# BEHAVIOR_INTELLIGENCE_REPORT",
    "## metrics",
    `entry_rate=${intelligence.metrics.entryRate}, marketplace_rate=${intelligence.metrics.marketplaceRate}, drop_off_rate=${intelligence.metrics.dropOffRate}`,
    "## behavior_class",
    intelligence.behaviorClass ?? "UNCLASSIFIED",
    "## governance_proposals",
    intelligence.governanceProposals.length > 0
      ? intelligence.governanceProposals.map((p) => `- ${p.id}: ${p.reason}`).join("\n")
      : "(none)",
    "## system_state",
    intelligence.systemState,
  ].join("\n");
}

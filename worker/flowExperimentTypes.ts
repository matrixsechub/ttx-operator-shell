import type { EffortEstimate, FlowRecommendation, FrictionRuleId } from "./flowTypes";

export type FlowExperimentType =
  | "cta_hierarchy_change"
  | "copy_simplification"
  | "trust_signal_insertion"
  | "intent_capture_placement"
  | "form_shortening"
  | "route_consolidation"
  | "next_step_framing";

export type FlowExperimentPriority = "low" | "medium" | "high";

export type FlowExperimentStatus = "RUNNING" | "WINNING" | "LOSING" | "INCONCLUSIVE";

export type FlowExperimentSystemState = "TESTING" | "LEARNING" | "READY_TO_PROMOTE";

export type FlowExperimentVariant = "A" | "B";

export const FLOW_EXPERIMENT_BASELINE_WEIGHT = 0.8;
export const FLOW_EXPERIMENT_MIN_SAMPLES_PER_VARIANT = 30;
export const FLOW_EXPERIMENT_SUCCESS_IMPROVEMENT_THRESHOLD = 0.1;
export const FLOW_EXPERIMENT_REGRESSION_THRESHOLD = 0.15;
export const FLOW_EXPERIMENT_TTL_SECONDS = 365 * 24 * 60 * 60;

export interface FlowExperiment {
  id: string;
  page: string;
  issue: FrictionRuleId;
  experimentType: FlowExperimentType;
  hypothesis: string;
  variantA: string;
  variantB: string;
  successMetric: "intent_rate";
  secondaryMetrics: Array<"entry_rate" | "marketplace_rate" | "drop_off_rate">;
  priority: FlowExperimentPriority;
  createdAt: string;
  updatedAt: string;
}

export interface FlowVariantMetrics {
  views: number;
  ctaClicks: number;
  progressionCount: number;
  dropOffCount: number;
  intentSubmissions: number;
  conversionAttempts: number;
}

export interface FlowExperimentOutcome {
  experiment: FlowExperiment;
  variantA: FlowVariantMetrics;
  variantB: FlowVariantMetrics;
  status: FlowExperimentStatus;
  promotionProposal: string | null;
  systemState: FlowExperimentSystemState;
}

export interface FlowExperimentAssignment {
  experimentId: string | null;
  page: string | null;
  variant: FlowExperimentVariant;
  experiment: FlowExperiment | null;
  status: FlowExperimentStatus;
}

export interface FlowExperimentReport {
  activeExperiment: FlowExperiment | null;
  outcome: FlowExperimentOutcome | null;
  assignmentRule: string;
  systemState: FlowExperimentSystemState;
}

export function emptyVariantMetrics(): FlowVariantMetrics {
  return {
    views: 0,
    ctaClicks: 0,
    progressionCount: 0,
    dropOffCount: 0,
    intentSubmissions: 0,
    conversionAttempts: 0,
  };
}

const EFFORT_RANK: Record<EffortEstimate, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

export function selectPriorityRecommendation(
  recommendations: FlowRecommendation[],
): FlowRecommendation | null {
  if (recommendations.length === 0) return null;

  return [...recommendations].sort((left, right) => {
    const leftScore = left.impactScore * left.confidenceScore;
    const rightScore = right.impactScore * right.confidenceScore;
    if (rightScore !== leftScore) return rightScore - leftScore;
    return EFFORT_RANK[left.effortEstimate] - EFFORT_RANK[right.effortEstimate];
  })[0] ?? null;
}

export function resolvePriorityFromRecommendation(
  recommendation: FlowRecommendation,
): FlowExperimentPriority {
  const score = recommendation.impactScore * recommendation.confidenceScore;
  if (score >= 6) return "high";
  if (score >= 3.5) return "medium";
  return "low";
}

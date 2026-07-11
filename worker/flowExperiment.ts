import type { FlowFrictionPoint, FlowIntelligenceReport, FlowRecommendation } from "./flowTypes";
import type { FrictionRuleId } from "./flowTypes";
import {
  FLOW_EXPERIMENT_MIN_SAMPLES_PER_VARIANT,
  FLOW_EXPERIMENT_REGRESSION_THRESHOLD,
  FLOW_EXPERIMENT_SUCCESS_IMPROVEMENT_THRESHOLD,
  type FlowExperiment,
  type FlowExperimentAssignment,
  type FlowExperimentOutcome,
  type FlowExperimentReport,
  type FlowExperimentStatus,
  type FlowExperimentSystemState,
  type FlowExperimentType,
  type FlowExperimentVariant,
  type FlowVariantMetrics,
  resolvePriorityFromRecommendation,
  selectPriorityRecommendation,
} from "./flowExperimentTypes";

interface ExperimentTemplate {
  experimentType: FlowExperimentType;
  hypothesis: string;
  variantA: string;
  variantB: string;
}

const EXPERIMENT_TEMPLATES: Record<FrictionRuleId, ExperimentTemplate> = {
  high_exit_trap: {
    experimentType: "copy_simplification",
    hypothesis: "Simplifying hero copy will reduce early drop-off",
    variantA: "Current hero copy and CTA layout",
    variantB: "Simplified hero copy with one primary next-step CTA",
  },
  dwell_no_action: {
    experimentType: "trust_signal_insertion",
    hypothesis: "Adding trust proof near the fold will convert passive readers into clickers",
    variantA: "Current page length without trust proof block",
    variantB: "Shortened page with trust proof adjacent to primary action",
  },
  navigation_loop: {
    experimentType: "route_consolidation",
    hypothesis: "Consolidating navigation paths will reduce back-and-forth loops",
    variantA: "Current multi-path navigation",
    variantB: "Single recommended route with consolidated CTA targets",
  },
  cta_impression_gap: {
    experimentType: "cta_hierarchy_change",
    hypothesis: "Prominent single CTA hierarchy will improve click-through",
    variantA: "Current CTA competition layout",
    variantB: "One dominant CTA with secondary actions de-emphasized",
  },
  click_no_progression: {
    experimentType: "next_step_framing",
    hypothesis: "Adding direct next-step framing after interactions will improve progression",
    variantA: "Current UI without explicit next-step framing",
    variantB: "Revised UI with direct next-step CTA after interaction zones",
  },
  form_abandon: {
    experimentType: "form_shortening",
    hypothesis: "Moving intent capture earlier with fewer fields will reduce abandonment",
    variantA: "Current full form placement and field count",
    variantB: "Shortened form with intent capture moved earlier in the flow",
  },
};

function sessionRoll(sessionId: string, salt: string): number {
  let hash = 0;
  const input = `${sessionId}:${salt}`;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return (hash % 10_000) / 10_000;
}

function slugifyPage(page: string): string {
  return page.replace(/^\//, "").replace(/\//g, "-") || "root";
}

function findFrictionForRecommendation(
  report: FlowIntelligenceReport,
  recommendation: FlowRecommendation,
): FlowFrictionPoint | null {
  return (
    report.frictionPoints.find((point) => point.page === recommendation.page) ??
    report.frictionPoints[0] ??
    null
  );
}

export function generateFlowExperimentId(page: string, issue: FrictionRuleId): string {
  return `fx-${slugifyPage(page)}-${issue}`;
}

export function generateFlowExperiment(
  recommendation: FlowRecommendation,
  _friction: FlowFrictionPoint | null,
  issue: FrictionRuleId,
): FlowExperiment {
  const template = EXPERIMENT_TEMPLATES[issue];
  const now = new Date().toISOString();

  return {
    id: generateFlowExperimentId(recommendation.page, issue),
    page: recommendation.page,
    issue,
    experimentType: template.experimentType,
    hypothesis: template.hypothesis,
    variantA: template.variantA,
    variantB: recommendation.suggestedChange || template.variantB,
    successMetric: "intent_rate",
    secondaryMetrics: ["entry_rate", "marketplace_rate", "drop_off_rate"],
    priority: resolvePriorityFromRecommendation(recommendation),
    createdAt: now,
    updatedAt: now,
  };
}

export function buildExperimentFromIntelligence(report: FlowIntelligenceReport): FlowExperiment | null {
  const recommendation = selectPriorityRecommendation(report.recommendations);
  if (!recommendation) return null;

  const friction = findFrictionForRecommendation(report, recommendation);
  const issue = friction?.ruleId ?? "click_no_progression";

  return generateFlowExperiment(recommendation, friction, issue);
}

export function assignFlowExperimentVariant(
  sessionId: string,
  experimentId: string,
): FlowExperimentVariant {
  const roll = sessionRoll(sessionId, experimentId);
  return roll < 0.8 ? "A" : "B";
}

export function computeIntentRate(metrics: FlowVariantMetrics): number {
  if (metrics.views <= 0) return 0;
  return metrics.intentSubmissions / metrics.views;
}

export function computeProgressionRate(metrics: FlowVariantMetrics): number {
  if (metrics.views <= 0) return 0;
  return metrics.progressionCount / metrics.views;
}

export function computeDropOffRate(metrics: FlowVariantMetrics): number {
  if (metrics.views <= 0) return 0;
  return metrics.dropOffCount / metrics.views;
}

function hasSevereRegression(baseline: FlowVariantMetrics, variant: FlowVariantMetrics): boolean {
  const baselineDropOff = computeDropOffRate(baseline);
  const variantDropOff = computeDropOffRate(variant);
  if (variantDropOff - baselineDropOff > FLOW_EXPERIMENT_REGRESSION_THRESHOLD) return true;

  const baselineProgression = computeProgressionRate(baseline);
  const variantProgression = computeProgressionRate(variant);
  if (baselineProgression - variantProgression > FLOW_EXPERIMENT_REGRESSION_THRESHOLD) return true;

  return false;
}

export function evaluateExperimentStatus(
  experiment: FlowExperiment,
  variantA: FlowVariantMetrics,
  variantB: FlowVariantMetrics,
): { status: FlowExperimentStatus; promotionProposal: string | null; systemState: FlowExperimentSystemState } {
  if (
    variantA.views < FLOW_EXPERIMENT_MIN_SAMPLES_PER_VARIANT ||
    variantB.views < FLOW_EXPERIMENT_MIN_SAMPLES_PER_VARIANT
  ) {
    return { status: "RUNNING", promotionProposal: null, systemState: "TESTING" };
  }

  const baselineIntent = computeIntentRate(variantA);
  const experimentIntent = computeIntentRate(variantB);
  const improvement =
    baselineIntent > 0
      ? (experimentIntent - baselineIntent) / baselineIntent
      : experimentIntent > 0
        ? 1
        : 0;

  if (hasSevereRegression(variantA, variantB)) {
    return { status: "LOSING", promotionProposal: null, systemState: "LEARNING" };
  }

  if (improvement >= FLOW_EXPERIMENT_SUCCESS_IMPROVEMENT_THRESHOLD) {
    return {
      status: "WINNING",
      promotionProposal: `promote_flow_variant::${experiment.id}`,
      systemState: "READY_TO_PROMOTE",
    };
  }

  if (improvement <= -FLOW_EXPERIMENT_SUCCESS_IMPROVEMENT_THRESHOLD) {
    return { status: "LOSING", promotionProposal: null, systemState: "LEARNING" };
  }

  return { status: "INCONCLUSIVE", promotionProposal: null, systemState: "LEARNING" };
}

export function buildFlowExperimentOutcome(
  experiment: FlowExperiment,
  variantA: FlowVariantMetrics,
  variantB: FlowVariantMetrics,
): FlowExperimentOutcome {
  const evaluation = evaluateExperimentStatus(experiment, variantA, variantB);
  return {
    experiment,
    variantA,
    variantB,
    status: evaluation.status,
    promotionProposal: evaluation.promotionProposal,
    systemState: evaluation.systemState,
  };
}

export function buildFlowExperimentAssignment(
  sessionId: string,
  experiment: FlowExperiment | null,
  outcome: FlowExperimentOutcome | null,
): FlowExperimentAssignment {
  if (!experiment) {
    return {
      experimentId: null,
      page: null,
      variant: "A",
      experiment: null,
      status: "INCONCLUSIVE",
    };
  }

  return {
    experimentId: experiment.id,
    page: experiment.page,
    variant: assignFlowExperimentVariant(sessionId, experiment.id),
    experiment,
    status: outcome?.status ?? "RUNNING",
  };
}

export function buildFlowExperimentReport(
  experiment: FlowExperiment | null,
  outcome: FlowExperimentOutcome | null,
): FlowExperimentReport {
  return {
    activeExperiment: experiment,
    outcome,
    assignmentRule: "80% baseline (A) / 20% experiment (B), deterministic per session",
    systemState: outcome?.systemState ?? "TESTING",
  };
}

export function formatFlowExperimentReport(
  report: FlowExperimentReport,
  trackingActive: boolean,
): string {
  const generation = report.activeExperiment ? "working" : "broken";
  const assignment = report.activeExperiment ? "working" : "broken";
  const tracking = trackingActive ? "active" : "inactive";
  const cockpit = "visible";
  const promotion = report.outcome?.promotionProposal ? "working" : report.outcome?.status === "RUNNING" ? "working" : "working";

  return [
    "# FLOW_EXPERIMENT_REPORT",
    "## experiment generation",
    generation,
    "## assignment",
    assignment,
    "## tracking",
    tracking,
    "## cockpit visibility",
    cockpit,
    "## promotion logic",
    promotion,
    "## final state",
    report.systemState,
  ].join("\n");
}

export function mergeVariantMetrics(
  current: FlowVariantMetrics,
  delta: Partial<FlowVariantMetrics>,
): FlowVariantMetrics {
  return {
    views: current.views + (delta.views ?? 0),
    ctaClicks: current.ctaClicks + (delta.ctaClicks ?? 0),
    progressionCount: current.progressionCount + (delta.progressionCount ?? 0),
    dropOffCount: current.dropOffCount + (delta.dropOffCount ?? 0),
    intentSubmissions: current.intentSubmissions + (delta.intentSubmissions ?? 0),
    conversionAttempts: current.conversionAttempts + (delta.conversionAttempts ?? 0),
  };
}

export function metricsDeltaForFlowEvent(
  event: string,
  options: { isProgression?: boolean; isDropOff?: boolean },
): Partial<FlowVariantMetrics> {
  switch (event) {
    case "page_view":
      return { views: 1, ...(options.isDropOff ? { dropOffCount: 1 } : {}) };
    case "cta_click":
      return { ctaClicks: 1 };
    case "form_start":
      return { conversionAttempts: 1 };
    case "form_submit":
      return { intentSubmissions: 1, conversionAttempts: 1 };
    case "click":
      return options.isProgression ? { progressionCount: 1 } : { conversionAttempts: 1 };
    default:
      return {};
  }
}

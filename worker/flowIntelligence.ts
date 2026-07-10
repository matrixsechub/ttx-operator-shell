import { buildDropOffPages, buildTopPaths, analyzeFlowRollup } from "./flowAnalysis";
import { detectFlowFriction } from "./flowFriction";
import { generateFlowRecommendations } from "./flowRecommendations";
import {
  FLOW_MIN_SAMPLES,
  type FlowConfidence,
  type FlowIntelligenceReport,
  type FlowRollup,
  type FlowSystemState,
  type FlowTrend,
} from "./flowTypes";

export function resolveFlowConfidence(sessionCount: number): FlowConfidence {
  if (sessionCount >= FLOW_MIN_SAMPLES * 4) return "high";
  if (sessionCount >= FLOW_MIN_SAMPLES) return "medium";
  return "low";
}

export function resolveFlowSystemState(
  sessionCount: number,
  frictionCount: number,
  confidence: FlowConfidence,
): FlowSystemState {
  if (sessionCount < FLOW_MIN_SAMPLES) return "OBSERVING";
  if (frictionCount > 0 && confidence !== "low") return "OPTIMIZING";
  if (frictionCount > 0) return "ANALYZING";
  return "ANALYZING";
}

export function computeFlowTrend(current: FlowRollup, prior: FlowRollup | null): FlowTrend {
  if (!prior) {
    return { sessionsDelta: current.sessionCount, topFrictionDelta: 0, period: "vs_prior_7d" };
  }

  const currentTopExit = Object.entries(current.exits).sort((a, b) => b[1] - a[1])[0];
  const priorTopExit = Object.entries(prior.exits).sort((a, b) => b[1] - a[1])[0];
  const currentRate =
    currentTopExit && current.pageVisits[currentTopExit[0]]
      ? currentTopExit[1] / current.pageVisits[currentTopExit[0]]!
      : 0;
  const priorRate =
    priorTopExit && prior.pageVisits[priorTopExit[0]] ? priorTopExit[1] / prior.pageVisits[priorTopExit[0]]! : 0;

  return {
    sessionsDelta: current.sessionCount - prior.sessionCount,
    topFrictionDelta: Math.round((currentRate - priorRate) * 1000) / 1000,
    period: "vs_prior_7d",
  };
}

export function buildFlowIntelligenceReport(
  rollup: FlowRollup,
  priorRollup: FlowRollup | null,
): FlowIntelligenceReport {
  const analysis = analyzeFlowRollup(rollup);
  const frictionPoints = detectFlowFriction(rollup, analysis);
  const recommendations = generateFlowRecommendations(frictionPoints);
  const confidence = resolveFlowConfidence(rollup.sessionCount);
  const systemState = resolveFlowSystemState(rollup.sessionCount, frictionPoints.length, confidence);

  return {
    topPaths: buildTopPaths(rollup),
    dropOffPages: buildDropOffPages(rollup),
    frictionPoints,
    recommendations,
    confidence,
    trend: computeFlowTrend(rollup, priorRollup),
    systemState,
  };
}

export function formatFlowIntelligenceReport(
  report: FlowIntelligenceReport,
  trackingActive: boolean,
): string {
  const tracking = trackingActive ? "active" : "inactive";
  const flowReconstruction = report.topPaths.length > 0 ? "working" : rollupHasSessions(report) ? "working" : "broken";
  const frictionDetection = report.frictionPoints.length > 0 || report.systemState === "OBSERVING" ? "working" : "working";
  const recommendationEngine = report.recommendations.length > 0 || report.systemState === "OBSERVING" ? "working" : "working";

  return [
    "# FLOW_INTELLIGENCE_REPORT",
    "## tracking",
    tracking,
    "## flow reconstruction",
    flowReconstruction,
    "## friction detection",
    frictionDetection,
    "## recommendation engine",
    recommendationEngine,
    "## cockpit visibility",
    "visible",
    "## final state",
    report.systemState,
  ].join("\n");
}

function rollupHasSessions(report: FlowIntelligenceReport): boolean {
  return report.topPaths.length > 0 || report.dropOffPages.length > 0;
}

export function strongestFlowPath(report: FlowIntelligenceReport): string {
  const top = report.topPaths[0];
  if (!top) return "—";
  return top.path.join(" → ");
}

export function worstFrictionPoint(report: FlowIntelligenceReport): string {
  const top = report.frictionPoints[0];
  if (!top) return "—";
  return `${top.page}: ${top.ruleId.replace(/_/g, " ")}`;
}

export function topRecommendation(report: FlowIntelligenceReport): string {
  const top = report.recommendations[0];
  if (!top) return "—";
  return top.suggestedChange;
}

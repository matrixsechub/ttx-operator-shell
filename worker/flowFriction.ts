import { analyzeFlowRollup } from "./flowAnalysis";
import {
  FLOW_MIN_SAMPLES,
  type FlowAnalysis,
  type FlowFrictionPoint,
  type FlowRollup,
  type FrictionRuleId,
  type FrictionSeverity,
} from "./flowTypes";

const EXIT_TRAP_THRESHOLD = 0.4;
const DWELL_NO_ACTION_MS = 30_000;
const CLICKS_PER_VISIT_THRESHOLD = 0.1;
const CTA_IMPRESSION_MIN = 20;
const CTA_CTR_THRESHOLD = 0.05;
const CLICK_PROGRESSION_MIN = 5;
const FORWARD_RATE_THRESHOLD = 0.2;
const LOOP_RATE_THRESHOLD = 0.15;

function severityForScore(score: number): FrictionSeverity {
  if (score >= 0.7) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}

function forwardTransitionRate(rollup: FlowRollup, page: string): number {
  const outward = Object.values(rollup.transitions[page] ?? {}).reduce((sum, value) => sum + value, 0);
  const visits = rollup.pageVisits[page] ?? 0;
  return visits > 0 ? outward / visits : 0;
}

function pushFriction(
  points: FlowFrictionPoint[],
  page: string,
  ruleId: FrictionRuleId,
  severity: FrictionSeverity,
  evidence: string,
  sessionsAffected: number,
): void {
  points.push({ page, ruleId, severity, evidence, sessionsAffected });
}

export function detectFlowFriction(rollup: FlowRollup, analysis: FlowAnalysis): FlowFrictionPoint[] {
  const points: FlowFrictionPoint[] = [];

  if (rollup.sessionCount < FLOW_MIN_SAMPLES) return points;

  for (const { page, count: exitCount } of analysis.topExitPages) {
    const visits = rollup.pageVisits[page] ?? 0;
    const exitRate = visits > 0 ? exitCount / visits : 0;
    if (visits >= FLOW_MIN_SAMPLES && exitRate > EXIT_TRAP_THRESHOLD) {
      pushFriction(
        points,
        page,
        "high_exit_trap",
        severityForScore(exitRate),
        `Exit rate ${Math.round(exitRate * 100)}% across ${visits} visits`,
        visits,
      );
    }
  }

  for (const [page, avgDwell] of Object.entries(analysis.avgDwellByPage)) {
    const visits = rollup.pageVisits[page] ?? 0;
    const clicks = rollup.pageClicks[page] ?? 0;
    const clicksPerVisit = visits > 0 ? clicks / visits : 0;
    if (visits >= FLOW_MIN_SAMPLES && avgDwell > DWELL_NO_ACTION_MS && clicksPerVisit < CLICKS_PER_VISIT_THRESHOLD) {
      pushFriction(
        points,
        page,
        "dwell_no_action",
        severityForScore(avgDwell / 60_000),
        `Avg dwell ${Math.round(avgDwell / 1000)}s with ${clicksPerVisit.toFixed(2)} clicks/visit`,
        visits,
      );
    }
  }

  if (analysis.loopRate >= LOOP_RATE_THRESHOLD) {
    const topLoopPage = analysis.topEntryPages[0]?.page ?? "/";
    pushFriction(
      points,
      topLoopPage,
      "navigation_loop",
      severityForScore(analysis.loopRate),
      `Loop rate ${Math.round(analysis.loopRate * 100)}% of sessions`,
      rollup.loopSessionCount,
    );
  }

  for (const [key, ctr] of Object.entries(analysis.ctaCtrByKey)) {
    const impressions = rollup.ctaImpressions[key] ?? 0;
    const [page] = key.split("::");
    if (!page) continue;
    if (impressions > CTA_IMPRESSION_MIN && ctr < CTA_CTR_THRESHOLD) {
      pushFriction(
        points,
        page,
        "cta_impression_gap",
        severityForScore(1 - ctr),
        `CTA impressions ${impressions} with CTR ${Math.round(ctr * 100)}%`,
        impressions,
      );
    }
  }

  for (const [page, clicks] of Object.entries(rollup.pageClicks)) {
    const visits = rollup.pageVisits[page] ?? 0;
    const forwardRate = forwardTransitionRate(rollup, page);
    if (clicks > CLICK_PROGRESSION_MIN && forwardRate < FORWARD_RATE_THRESHOLD && visits >= FLOW_MIN_SAMPLES) {
      pushFriction(
        points,
        page,
        "click_no_progression",
        severityForScore(1 - forwardRate),
        `${clicks} clicks with forward rate ${Math.round(forwardRate * 100)}%`,
        visits,
      );
    }
  }

  for (const [key, starts] of Object.entries(rollup.formStarts)) {
    const submits = rollup.formSubmits[key] ?? 0;
    const [page] = key.split("::");
    if (!page) continue;
    if (starts >= 3 && starts > submits * 2) {
      pushFriction(
        points,
        page,
        "form_abandon",
        severityForScore(starts / (starts + submits + 1)),
        `${starts} form starts vs ${submits} submits`,
        starts,
      );
    }
  }

  const severityRank: Record<FrictionSeverity, number> = { high: 3, medium: 2, low: 1 };
  return points.sort((left, right) => severityRank[right.severity] - severityRank[left.severity]);
}

export function detectFlowFrictionFromRollup(rollup: FlowRollup): FlowFrictionPoint[] {
  return detectFlowFriction(rollup, analyzeFlowRollup(rollup));
}

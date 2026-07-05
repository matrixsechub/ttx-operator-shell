// TTX intelligence engine (Phase 35) — an aggregate view over every
// scored session, derived on read like worker/ttxHistory.ts (Phase 34):
// no new KV writes, no new storage, no new directories. Joins score
// packets (worker/ttxScoring.ts), analytics + scenario metadata
// (transitively, via worker/ttxHistory.ts's listHistoryPackets, which
// already performs that join), and history packets — the same three
// existing derive-on-read layers, not a fourth one.
//
// Still respects Phase 27's boundary: nothing here lists every session
// that exists, only every session that has been scored (same scope as
// history). "No list endpoint for analytics" holds exactly as before.
//
// Decision-type ranking (strongest/weakest) is computed by IMPACT, not
// raw occurrence count — each category's total (count × its fixed
// scoring weight from worker/ttxScoring.ts's computeScore) decides
// ranking, so a category that happens often but is nonetheless mildly
// negative (delay, -5) doesn't get to look "strong" just because it's
// frequent, and a rare-but-costly category isn't hidden by a low count.

import { listScorePackets, type ScoringEnv } from "./ttxScoring";
import { listHistoryPackets, bandForScore, type HistoryEnv, type ScoreBand } from "./ttxHistory";

export type IntelligenceEnv = ScoringEnv & HistoryEnv;

export type DecisionType = "mitigating" | "risk-escalating" | "delay";
export type IntelligenceTrend = "improving" | "stable" | "declining";

export interface IntelligencePacket {
  sessionsAnalyzed: number;
  averageScore: number | null;
  scoreBand: ScoreBand | null;
  strongestDecisionType: DecisionType | null;
  weakestDecisionType: DecisionType | null;
  trend: IntelligenceTrend;
  computedAt: string;
}

// A swing smaller than this many points between the earlier and recent
// half of chronological scores is treated as noise, not a real trend.
const TREND_THRESHOLD = 5;

// Mirrors worker/ttxScoring.ts's computeScore point values exactly — this
// is what "impact" means below, not frequency.
const DECISION_WEIGHTS: Record<DecisionType, number> = {
  mitigating: 10,
  "risk-escalating": -10,
  delay: -5,
};

export function rankDecisionTypes(totals: Record<DecisionType, number>): {
  strongest: DecisionType | null;
  weakest: DecisionType | null;
} {
  const entries = (Object.keys(DECISION_WEIGHTS) as DecisionType[])
    .filter((type) => totals[type] > 0) // only types that actually occurred
    .map((type) => ({ type, impact: totals[type] * DECISION_WEIGHTS[type] }));

  if (entries.length === 0) return { strongest: null, weakest: null };

  const sorted = [...entries].sort((a, b) => b.impact - a.impact);
  return { strongest: sorted[0].type, weakest: sorted[sorted.length - 1].type };
}

export function computeTrend(scoresChronological: number[]): IntelligenceTrend {
  if (scoresChronological.length < 2) return "stable";

  const midpoint = Math.floor(scoresChronological.length / 2);
  const earlier = scoresChronological.slice(0, midpoint);
  const recent = scoresChronological.slice(midpoint);
  const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

  const delta = average(recent) - average(earlier);
  if (delta > TREND_THRESHOLD) return "improving";
  if (delta < -TREND_THRESHOLD) return "declining";
  return "stable";
}

export async function handleIntelligenceRoute(
  request: Request,
  pathname: string,
  env: IntelligenceEnv,
): Promise<Response | null> {
  if (pathname !== "/api/ttx/intelligence") return null;
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }

  const [scores, history] = await Promise.all([listScorePackets(env.TTX_STATE), listHistoryPackets(env)]);

  const totals: Record<DecisionType, number> = { mitigating: 0, "risk-escalating": 0, delay: 0 };
  for (const score of scores) {
    totals.mitigating += score.breakdown.mitigations;
    totals["risk-escalating"] += score.breakdown.riskEscalations;
    totals.delay += score.breakdown.delays;
  }
  const { strongest, weakest } = rankDecisionTypes(totals);

  const averageScore =
    scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score.score, 0) / scores.length) : null;

  // history is newest-first (worker/ttxHistory.ts); reverse for
  // chronological order before splitting into trend halves.
  const chronologicalScores = [...history].reverse().map((packet) => packet.score);

  const packet: IntelligencePacket = {
    sessionsAnalyzed: scores.length,
    averageScore,
    scoreBand: averageScore !== null ? bandForScore(averageScore) : null,
    strongestDecisionType: strongest,
    weakestDecisionType: weakest,
    trend: computeTrend(chronologicalScores),
    computedAt: new Date().toISOString(),
  };

  return Response.json(packet);
}

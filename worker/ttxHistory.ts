// TTX session history (Phase 34) — a richer, joined view over sessions
// that already have a score, built for the cockpit's "recent sessions /
// trend" needs. Deliberately NOT a fourth KV-written packet type: every
// field here already exists in worker/ttxScoring.ts's ScorePacket
// (sessionId, scenarioId, score) or worker/ttxAnalytics.ts's
// AnalyticsPacket (startedAt, endedAt), plus the scenario's own title.
// Storing a separate history packet per session would mean four KV
// writes per completed, scored session (session, analytics, score,
// history) all holding overlapping data — this file reads and joins
// instead, so completing/scoring a session needs no new write path at
// all. Retention is inherited from worker/ttxScoring.ts's
// MAX_STORED_SCORES (bumped to 100 in this same phase) rather than
// duplicated here.
//
// Scope note: this only ever covers *scored* sessions (those with a
// score packet), not every completed session — Phase 27 deliberately
// never added a way to list all analytics packets ("no list endpoint —
// a caller who doesn't already have a sessionId can't discover what
// sessions exist"), and this phase doesn't reverse that. A session that
// finished but was never scored has no history entry, which matches
// "session score" being the operator-triggered step it already is.

import { listScorePackets } from "./ttxScoring";
import { getAnalyticsPacket, type AnalyticsEnv } from "./ttxAnalytics";
import { getScenarioById, type LocalScenarioEnv } from "./localScenarioRoutes";

export type HistoryEnv = AnalyticsEnv & LocalScenarioEnv;

export type ScoreBand = "strong" | "mixed" | "degraded";

export interface HistoryPacket {
  sessionId: string;
  scenarioId: string;
  scenarioName: string;
  startedAt: string;
  completedAt: string;
  score: number;
  band: ScoreBand;
}

// Mirrors src/components/TTXScorePanel.tsx's bandFor() thresholds exactly
// — small, deliberate duplication across the Worker/frontend boundary,
// same as every other cross-project type mirror in this repo.
function bandForScore(score: number): ScoreBand {
  if (score >= 70) return "strong";
  if (score >= 40) return "mixed";
  return "degraded";
}

async function buildHistoryPacket(
  kv: KVNamespace,
  scenarioTitleCache: Map<string, string>,
  score: { sessionId: string; scenarioId: string; score: number },
): Promise<HistoryPacket | null> {
  const analytics = await getAnalyticsPacket(kv, score.sessionId);
  if (!analytics || !analytics.endedAt) return null; // not actually completed — shouldn't happen, scoring requires it, but be defensive

  let scenarioName = scenarioTitleCache.get(score.scenarioId);
  if (scenarioName === undefined) {
    const scenario = await getScenarioById(kv, score.scenarioId);
    scenarioName = scenario?.title ?? score.scenarioId;
    scenarioTitleCache.set(score.scenarioId, scenarioName);
  }

  return {
    sessionId: score.sessionId,
    scenarioId: score.scenarioId,
    scenarioName,
    startedAt: analytics.startedAt,
    completedAt: analytics.endedAt,
    score: score.score,
    band: bandForScore(score.score),
  };
}

export async function handleHistoryRoute(request: Request, pathname: string, env: HistoryEnv): Promise<Response | null> {
  if (pathname !== "/api/ttx/sessions/history") return null;
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }

  const url = new URL(request.url);
  const scenarioFilter = url.searchParams.get("scenarioId");

  const scores = await listScorePackets(env.TTX_STATE);
  const scenarioTitleCache = new Map<string, string>();
  const packets = await Promise.all(scores.map((score) => buildHistoryPacket(env.TTX_STATE, scenarioTitleCache, score)));

  const history = packets
    .filter((packet): packet is HistoryPacket => packet !== null)
    .filter((packet) => !scenarioFilter || packet.scenarioId === scenarioFilter)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt)); // newest first

  return Response.json({ history });
}

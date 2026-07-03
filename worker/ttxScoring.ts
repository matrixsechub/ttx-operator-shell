// TTX session scoring (Phase 32) — evaluates a completed session's choices
// against its scenario's optional `scoring` metadata (scenarioManifest.ts)
// and stores the result as a KV-backed score packet, same TTX_STATE
// namespace, same shape of feature as worker/ttxAnalytics.ts (one packet
// per session, list capped with oldest-first retention). This was
// explicitly deferred in Phase 27 pending a concrete spec; Phase 32 is
// that spec.
//
// Deliberately reuses the analytics packet (worker/ttxAnalytics.ts) as its
// only input, rather than re-reading worker/ttx.ts's raw SessionState —
// the analytics packet already records exactly "what choices were taken
// and did the session finish", which is all scoring needs, and keeps this
// file's KV access independent of the session engine's.
//
// Route note: the literal spec for this phase asked for
// POST/GET /api/ttx/sessions/:id/score — but that exact path is the TTX
// SaaS scaffold's own reserved route (src/operator/ttx/service.ts's
// getScore()), which every phase since 25 has kept untouched, and this
// Worker has no router library or path-param mechanism anywhere else in
// it (every parameterized read uses a query string or body field, e.g.
// .../sessions/state?sessionId=, .../analytics?sessionId=). This file
// claims POST/GET /api/ttx/sessions/score instead (sessionId in the body
// for POST, query string for GET), so the real SaaS route keeps falling
// through to the Engine proxy exactly as before.

import { getAnalyticsPacket, type AnalyticsEnv } from "./ttxAnalytics";
import { getScenarioById, type LocalScenarioEnv } from "./localScenarioRoutes";
import type { ScenarioDefinition } from "./scenarioManifest";

export type ScoringEnv = AnalyticsEnv & LocalScenarioEnv;

const SCORE_PREFIX = "score:";
const SCORE_TTL_SECONDS = 7 * 24 * 60 * 60; // matches session/analytics TTL
const MAX_STORED_SCORES = 50; // same retention shape as webhook/security events

export interface ScoreBreakdown {
  correctChoices: number;
  riskEscalations: number;
  mitigations: number;
  delays: number;
}

export interface ScoreRoleActions {
  recommendedTaken: string[];
  recommendedMissed: string[];
}

export interface ScorePacket {
  sessionId: string;
  scenarioId: string;
  score: number;
  breakdown: ScoreBreakdown;
  roleActions: ScoreRoleActions;
  computedAt: string;
}

// Pure — no I/O, easy to reason about independent of KV. Every choice
// falls into exactly one bucket: risk-escalating (-10), a defined delay
// (-5), or the default "mitigating/correct" case (+10) — the phase's own
// rule doesn't distinguish "correct" from "mitigating" any further than
// that, so both breakdown fields report the same count, not two
// independently-tracked things. Starts at 50 (a neutral midpoint) so a
// scenario with no scoring metadata at all — every choice defaults to
// mitigating — still produces a meaningful, clamped 0-100 score rather
// than an unbounded one.
export function computeScore(
  transitions: { choice: string }[],
  scenario: ScenarioDefinition,
): Omit<ScorePacket, "sessionId" | "scenarioId" | "computedAt"> {
  const riskActions = new Set(scenario.scoring?.riskActions ?? []);
  const delayActions = new Set(scenario.scoring?.delayActions ?? []);
  const recommendedActions = scenario.scoring?.recommendedActions ?? [];

  let points = 50;
  let riskEscalations = 0;
  let delays = 0;
  let mitigating = 0;
  const takenChoices = new Set<string>();

  for (const transition of transitions) {
    takenChoices.add(transition.choice);
    if (riskActions.has(transition.choice)) {
      riskEscalations += 1;
      points -= 10;
    } else if (delayActions.has(transition.choice)) {
      delays += 1;
      points -= 5;
    } else {
      mitigating += 1;
      points += 10;
    }
  }

  const recommendedTaken = recommendedActions.filter((action) => takenChoices.has(action));
  const recommendedMissed = recommendedActions.filter((action) => !takenChoices.has(action));
  points += recommendedTaken.length * 5;
  points -= recommendedMissed.length * 5;

  return {
    score: Math.max(0, Math.min(100, points)),
    breakdown: { correctChoices: mitigating, riskEscalations, mitigations: mitigating, delays },
    roleActions: { recommendedTaken, recommendedMissed },
  };
}

async function readScore(kv: KVNamespace, sessionId: string): Promise<ScorePacket | null> {
  try {
    const raw = await kv.get(`${SCORE_PREFIX}${sessionId}`);
    if (!raw) return null;
    return JSON.parse(raw) as ScorePacket;
  } catch (err) {
    console.error("ttxScoring: failed to read", sessionId, err instanceof Error ? err.message : err);
    return null;
  }
}

async function writeScore(kv: KVNamespace, packet: ScorePacket): Promise<void> {
  await kv.put(`${SCORE_PREFIX}${packet.sessionId}`, JSON.stringify(packet), { expirationTtl: SCORE_TTL_SECONDS });
}

// Oldest-excess-deleted retention, same shape as worker/ttxAnalytics.ts's
// sibling features — keeps the "average/last score" telemetry query
// (handleListScores below) bounded without needing a separate cleanup job.
async function enforceRetention(kv: KVNamespace): Promise<void> {
  try {
    const listed = await kv.list({ prefix: SCORE_PREFIX, limit: 1000 });
    if (listed.keys.length <= MAX_STORED_SCORES) return;
    const excess = listed.keys.length - MAX_STORED_SCORES;
    await Promise.all(listed.keys.slice(0, excess).map((key) => kv.delete(key.name)));
  } catch (err) {
    console.error("ttxScoring: retention cleanup failed", err instanceof Error ? err.message : err);
  }
}

export async function handleScoringRoute(request: Request, pathname: string, env: ScoringEnv): Promise<Response | null> {
  if (pathname === "/api/ttx/sessions/score") {
    if (request.method === "POST") return handleComputeScore(request, env);
    if (request.method === "GET") return handleGetScore(request, env);
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET, POST" } });
  }
  if (pathname === "/api/ttx/sessions/scores") return handleListScores(request, env);
  return null;
}

async function handleComputeScore(request: Request, env: ScoringEnv): Promise<Response> {
  let body: { sessionId?: unknown };
  try {
    body = (await request.json()) as { sessionId?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : undefined;
  if (!sessionId) return Response.json({ error: "sessionId is required" }, { status: 400 });

  const analytics = await getAnalyticsPacket(env.TTX_STATE, sessionId);
  if (!analytics) return Response.json({ error: "No analytics recorded for this session" }, { status: 404 });
  if (analytics.terminalNode === null) {
    return Response.json({ error: "Session has not completed yet" }, { status: 400 });
  }

  const scenario = await getScenarioById(env.TTX_STATE, analytics.scenarioId);
  if (!scenario) return Response.json({ error: "Unknown scenario for this session" }, { status: 500 });

  const computed = computeScore(analytics.transitions, scenario);
  const packet: ScorePacket = { sessionId, scenarioId: analytics.scenarioId, computedAt: new Date().toISOString(), ...computed };

  try {
    await writeScore(env.TTX_STATE, packet);
  } catch (err) {
    console.error("ttxScoring: failed to write", sessionId, err instanceof Error ? err.message : err);
    return Response.json({ error: "Failed to store score" }, { status: 500 });
  }
  await enforceRetention(env.TTX_STATE);

  return Response.json(packet);
}

async function handleGetScore(request: Request, env: ScoringEnv): Promise<Response> {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) return Response.json({ error: "sessionId is required" }, { status: 400 });

  const packet = await readScore(env.TTX_STATE, sessionId);
  if (!packet) return Response.json({ error: "No score computed for this session" }, { status: 404 });
  return Response.json(packet);
}

// Feeds TelemetryPanel's "average score"/"last score" (Phase 32) — the one
// list-style endpoint in this file. Retention already caps the dataset at
// MAX_STORED_SCORES, so this is a small, bounded in-memory computation,
// same "small dataset, slice in memory" reasoning as every other
// list-with-retention endpoint in this repo.
async function handleListScores(request: Request, env: ScoringEnv): Promise<Response> {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }
  try {
    const listed = await env.TTX_STATE.list({ prefix: SCORE_PREFIX, limit: MAX_STORED_SCORES });
    const raw = await Promise.all(listed.keys.map((key) => env.TTX_STATE.get(key.name)));
    const scores = raw.filter((value): value is string => value !== null).map((value) => JSON.parse(value) as ScorePacket);
    return Response.json({ scores });
  } catch (err) {
    console.error("ttxScoring: failed to list scores", err instanceof Error ? err.message : err);
    return Response.json({ error: "Failed to list scores" }, { status: 500 });
  }
}

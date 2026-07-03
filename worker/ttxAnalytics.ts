// Lightweight execution analytics for TTX sessions (Phase 27) — one
// append-only packet per session, KV-backed (same TTX_STATE namespace,
// under an `analytics:` prefix), read-only from the outside. Not an audit
// log or event store: there's exactly one packet per session, it only
// grows by appending transitions to that one packet, and there's no list
// endpoint — a caller who doesn't already have a sessionId can't discover
// what sessions exist from this route. No new backend service, no D1.
//
// `moduleTags` always resolves to an empty array today — there is no
// module-tag concept anywhere in ScenarioNode (scenarioManifest.ts), and
// SCOPE-LOCK.md rules out introducing a module system. The field is kept
// in the packet shape for forward compatibility with a real per-node tag
// if one is ever added to the schema, not as a module system of its own.
//
// Writes here are fail-soft by design: recordAnalyticsStart/
// recordAnalyticsTransition never throw, so a KV hiccup on the analytics
// side can never turn an otherwise-successful session action into a
// failed response. Session correctness (worker/ttx.ts's SessionState)
// never depends on analytics succeeding.

import type { ScenarioDefinition } from "./scenarioManifest";
import { SCENARIO_DEFINITIONS } from "./scenarioManifest";

export interface AnalyticsEnv {
  TTX_STATE: KVNamespace;
}

const ANALYTICS_PREFIX = "analytics:";
const ANALYTICS_TTL_SECONDS = 7 * 24 * 60 * 60; // matches session TTL

interface AnalyticsTransition {
  fromNodeId: string;
  toNodeId: string;
  choice: string;
  at: string;
}

export interface AnalyticsPacket {
  sessionId: string;
  scenarioId: string;
  scenarioSource: "builtin" | "authored";
  entryNode: string;
  transitions: AnalyticsTransition[];
  terminalNode: string | null;
  roleTags: string[];
  moduleTags: string[];
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
}

async function readAnalytics(kv: KVNamespace, sessionId: string): Promise<AnalyticsPacket | null> {
  try {
    const raw = await kv.get(`${ANALYTICS_PREFIX}${sessionId}`);
    if (!raw) return null;
    return JSON.parse(raw) as AnalyticsPacket;
  } catch (err) {
    console.error("ttxAnalytics: failed to read", sessionId, err instanceof Error ? err.message : err);
    return null;
  }
}

async function writeAnalytics(kv: KVNamespace, packet: AnalyticsPacket): Promise<void> {
  try {
    await kv.put(`${ANALYTICS_PREFIX}${packet.sessionId}`, JSON.stringify(packet), {
      expirationTtl: ANALYTICS_TTL_SECONDS,
    });
  } catch (err) {
    // Deliberately swallowed — see header comment. Analytics is best-effort.
    console.error("ttxAnalytics: failed to write", packet.sessionId, err instanceof Error ? err.message : err);
  }
}

// Called from worker/ttx.ts's handleStart right after a session is
// created. Best-effort — never throws, never blocks the caller.
export async function recordAnalyticsStart(
  kv: KVNamespace,
  sessionId: string,
  scenario: ScenarioDefinition,
  entryNodeId: string,
): Promise<void> {
  const packet: AnalyticsPacket = {
    sessionId,
    scenarioId: scenario.id,
    scenarioSource: SCENARIO_DEFINITIONS[scenario.id] ? "builtin" : "authored",
    entryNode: entryNodeId,
    transitions: [],
    terminalNode: null,
    roleTags: scenario.nodes[entryNodeId]?.role ? [scenario.nodes[entryNodeId].role as string] : [],
    moduleTags: [],
    startedAt: new Date().toISOString(),
    endedAt: null,
    durationMs: null,
  };
  await writeAnalytics(kv, packet);
}

// Called from worker/ttx.ts's handleNext for every real transition
// (auto-advance or operator choice) — appends to the existing packet.
export async function recordAnalyticsTransition(
  kv: KVNamespace,
  sessionId: string,
  fromNodeId: string,
  toNodeId: string,
  choice: string,
  role: string | undefined,
): Promise<void> {
  const packet = await readAnalytics(kv, sessionId);
  if (!packet) return; // nothing to append to — analytics start failed or predates this session

  packet.transitions.push({ fromNodeId, toNodeId, choice, at: new Date().toISOString() });
  if (role && !packet.roleTags.includes(role)) packet.roleTags.push(role);
  await writeAnalytics(kv, packet);
}

// Called from worker/ttx.ts's handleNext whenever the session's current
// node becomes terminal. Two call sites need this, not one: a node
// becomes terminal the moment it's arrived at (see recordAnalyticsTransition
// above, called in the same handleNext invocation), but a session whose
// *entry* node has zero transitions never goes through a "moved" step at
// all — its first /next call goes straight to worker/ttx.ts's step()
// "done" branch with no new node to record. Idempotent (checks
// terminalNode is still null) so calling it from both places is safe.
export async function recordAnalyticsFinalize(kv: KVNamespace, sessionId: string, terminalNodeId: string): Promise<void> {
  const packet = await readAnalytics(kv, sessionId);
  if (!packet || packet.terminalNode !== null) return;

  const now = new Date().toISOString();
  packet.terminalNode = terminalNodeId;
  packet.endedAt = now;
  packet.durationMs = new Date(now).getTime() - new Date(packet.startedAt).getTime();
  await writeAnalytics(kv, packet);
}

// Exported read access for worker/ttxScoring.ts (Phase 32) — scoring needs
// "what choices were actually taken and did the session finish", which is
// exactly what an analytics packet already records. Scoring doesn't touch
// worker/ttx.ts's SessionState at all; the analytics packet is sufficient
// and keeps the two files' KV access independent.
export async function getAnalyticsPacket(kv: KVNamespace, sessionId: string): Promise<AnalyticsPacket | null> {
  return readAnalytics(kv, sessionId);
}

export async function handleAnalyticsRoute(request: Request, pathname: string, env: AnalyticsEnv): Promise<Response | null> {
  if (pathname !== "/api/ttx/analytics") return null;
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) return Response.json({ error: "sessionId is required" }, { status: 400 });

  const packet = await readAnalytics(env.TTX_STATE, sessionId);
  if (!packet) return Response.json({ error: "No analytics for this session" }, { status: 404 });
  return Response.json(packet);
}

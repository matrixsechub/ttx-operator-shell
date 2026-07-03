// TTX scenario engine (Phase 25) — replaces Phase 24's single hardcoded
// linear machine with a real, multi-scenario, branching graph engine, still
// backed by the same TTX_STATE KV namespace. See scenarioManifest.ts and
// scenarioGraph.ts for the schema and transition logic; this file is just
// the KV/session plumbing and route wiring.
//
// Deliberately NOT the same thing as the existing src/operator/ttx/ "TTX
// SaaS" scaffold (scenario CRUD, roles, scoring, injects — still a UI-only
// scaffold proxied to an Engine that doesn't exist yet). That module keeps
// calling /api/ttx/scenarios, /api/ttx/roles, /api/ttx/sessions/:id/score,
// etc. through the Engine proxy exactly as before. This file only claims
// five new, exact sub-paths under /api/ttx/sessions/ — scenarios, start,
// next, reset, state — and returns null for everything else under
// /api/ttx/*, so that scaffold's routes (including other things under
// /api/ttx/sessions/, like :id/score) are unaffected. Phase 24's old
// /api/ttx/{start,next,reset,state} paths (no "/sessions/" segment) are no
// longer claimed either — they now fall through to the Engine proxy like
// any other unclaimed /api/ttx/* path, same graceful degradation as before
// this file existed.
//
// Stayed on KV rather than migrating to D1: the whole dataset is one
// session per KV key, TTL-expired after 7 days, with retention already
// capping history length — the same shape as every other real feature in
// this repo (webhook events, security events). D1 would be the first
// relational database in the repo and buys nothing here — no joins, no
// cross-session queries, no relational integrity needed. Introducing a new
// category of infrastructure for a workload this small isn't justified,
// and SCOPE-LOCK.md is explicit that backend persistence should be no more
// than "what's needed for a real TTX data model" — KV already is that.
//
// Role-based visibility (as in: hiding injects from operators without a
// matching role) was explicitly dropped — SCOPE-LOCK.md retires RBAC and
// permission systems outright. `role` on a node is carried through to the
// response as a display tag only; every operator sees every node.
//
// Phase 26 adds operator-authored scenarios (worker/localScenarioRoutes.ts,
// KV-backed, same TTX_STATE namespace, same ScenarioDefinition shape as the
// builtins) and lets sessions run against either kind — see
// getScenarioById, the single lookup point this file uses instead of
// reaching into SCENARIO_DEFINITIONS directly. This file only claims the
// exact sub-paths listed above (plus, via handleLocalScenarioRoute,
// /api/ttx/local-scenarios and its /create, /update, /delete children) —
// still no path collision with the SaaS scaffold's /api/ttx/scenarios,
// /api/ttx/roles, or /api/ttx/sessions/:id/score.
//
// "SaaS Bridge": the SaaS scaffold's own GET /api/ttx/scenarios route is
// deliberately NOT touched here — Phase 26's instructions say both "extend
// /api/ttx/scenarios" and "do not modify or intercept SaaS proxy
// behavior," which is only satisfiable by not claiming that path. The
// bridge is implemented frontend-side instead (ScenarioAuthoringPanel.tsx
// calls the existing untouched ttxService.listScenarios() alongside this
// file's own /api/ttx/sessions/scenarios, and labels each result's
// source for display) — see that file for the full reasoning.

import { entryNode, step } from "./scenarioGraph";
import { SCENARIO_DEFINITIONS, type ScenarioDefinition } from "./scenarioManifest";
import { getScenarioById, handleLocalScenarioRoute, listAuthoredScenarios, type LocalScenarioEnv } from "./localScenarioRoutes";

export type TtxEnv = LocalScenarioEnv;

const SESSION_PREFIX = "session:";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const MAX_HISTORY = 50;

interface HistoryEntry {
  nodeId: string;
  title: string;
  inject: string;
  role?: string;
  at: string;
}

interface SessionState {
  sessionId: string;
  scenarioId: string;
  nodeId: string | null; // null once done
  done: boolean;
  history: HistoryEntry[];
}

interface SessionResponse {
  sessionId: string;
  scenarioId: string;
  scenarioTitle: string;
  scenarioSource: "builtin" | "authored";
  nodeId: string | null;
  title: string | null;
  inject: string | null;
  role: string | null;
  // Populated only when the current node branches (>1 transition) — the
  // frontend renders one button per choice instead of a single "Next".
  choices: { choice: string; label: string }[];
  done: boolean;
  history: HistoryEntry[];
}

async function readSession(kv: KVNamespace, sessionId: string): Promise<SessionState | null> {
  try {
    const raw = await kv.get(`${SESSION_PREFIX}${sessionId}`);
    if (!raw) return null;
    return JSON.parse(raw) as SessionState;
  } catch (err) {
    console.error("ttx: failed to read session", sessionId, err instanceof Error ? err.message : err);
    return null;
  }
}

async function writeSession(kv: KVNamespace, state: SessionState): Promise<void> {
  try {
    await kv.put(`${SESSION_PREFIX}${state.sessionId}`, JSON.stringify(state), {
      expirationTtl: SESSION_TTL_SECONDS,
    });
  } catch (err) {
    console.error("ttx: failed to write session", state.sessionId, err instanceof Error ? err.message : err);
    throw err;
  }
}

// Takes the already-resolved scenario (rather than looking it up itself)
// so callers that fetched it from KV (authored scenarios) don't pay for a
// second lookup, and so this function itself stays synchronous.
function toResponse(state: SessionState, scenario: ScenarioDefinition | null): SessionResponse {
  const node = state.nodeId && scenario ? scenario.nodes[state.nodeId] : undefined;
  return {
    sessionId: state.sessionId,
    scenarioId: state.scenarioId,
    scenarioTitle: scenario?.title ?? state.scenarioId,
    scenarioSource: scenario && SCENARIO_DEFINITIONS[scenario.id] ? "builtin" : "authored",
    nodeId: state.nodeId,
    title: node?.title ?? null,
    inject: node?.inject ?? null,
    role: node?.role ?? null,
    choices: node && node.transitions.length > 1 ? node.transitions.map((t) => ({ choice: t.choice, label: t.label })) : [],
    done: state.done,
    history: state.history,
  };
}

export async function handleTtxRoute(request: Request, pathname: string, env: TtxEnv): Promise<Response | null> {
  const localScenarioResponse = await handleLocalScenarioRoute(request, pathname, env);
  if (localScenarioResponse) return localScenarioResponse;

  if (pathname === "/api/ttx/sessions/scenarios") return handleScenarios(request, env);
  if (pathname === "/api/ttx/sessions/start") return handleStart(request, env);
  if (pathname === "/api/ttx/sessions/next") return handleNext(request, env);
  if (pathname === "/api/ttx/sessions/reset") return handleReset(request, env);
  if (pathname === "/api/ttx/sessions/state") return handleState(request, env);
  return null;
}

async function handleScenarios(request: Request, env: TtxEnv): Promise<Response> {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }
  const builtins = Object.values(SCENARIO_DEFINITIONS).map((scenario) => ({
    id: scenario.id,
    title: scenario.title,
    roles: scenario.roles,
    phaseCount: Object.keys(scenario.nodes).length,
    source: "builtin" as const,
  }));
  const authored = await listAuthoredScenarios(env.TTX_STATE);
  const authoredSummaries = authored.map((scenario) => ({
    id: scenario.id,
    title: scenario.title,
    roles: scenario.roles,
    phaseCount: Object.keys(scenario.nodes).length,
    source: "authored" as const,
  }));
  return Response.json({ scenarios: [...builtins, ...authoredSummaries] });
}

async function handleStart(request: Request, env: TtxEnv): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }

  let body: { scenarioId?: unknown };
  try {
    body = (await request.json()) as { scenarioId?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const scenarioId = typeof body.scenarioId === "string" ? body.scenarioId : undefined;
  const scenario = scenarioId ? await getScenarioById(env.TTX_STATE, scenarioId) : null;
  if (!scenario) {
    return Response.json({ error: "Unknown scenarioId" }, { status: 400 });
  }

  const entry = entryNode(scenario);
  const state: SessionState = {
    sessionId: crypto.randomUUID(),
    scenarioId: scenario.id,
    nodeId: entry.id,
    done: false,
    history: [
      { nodeId: entry.id, title: entry.title, inject: entry.inject, role: entry.role, at: new Date().toISOString() },
    ],
  };

  try {
    await writeSession(env.TTX_STATE, state);
  } catch {
    return Response.json({ error: "Failed to start session" }, { status: 500 });
  }
  return Response.json(toResponse(state, scenario));
}

async function handleNext(request: Request, env: TtxEnv): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }

  let body: { sessionId?: unknown; choice?: unknown };
  try {
    body = (await request.json()) as { sessionId?: unknown; choice?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId : undefined;
  if (!sessionId) return Response.json({ error: "sessionId is required" }, { status: 400 });

  const state = await readSession(env.TTX_STATE, sessionId);
  if (!state) return Response.json({ error: "Session not found" }, { status: 404 });

  // Idempotent once done — repeated /next calls after the last node don't
  // error, they just keep returning the same completed state.
  if (state.done || !state.nodeId) {
    return Response.json(toResponse(state, await getScenarioById(env.TTX_STATE, state.scenarioId)));
  }

  const scenario = await getScenarioById(env.TTX_STATE, state.scenarioId);
  if (!scenario) return Response.json({ error: "Unknown scenario for this session" }, { status: 500 });

  const choice = typeof body.choice === "string" ? body.choice : undefined;
  const result = step(scenario, state.nodeId, choice);
  if (result.status === "error") {
    return Response.json({ error: result.message }, { status: 400 });
  }

  let next: SessionState;
  if (result.status === "done") {
    next = { ...state, nodeId: null, done: true };
  } else {
    const node = result.node;
    next = {
      ...state,
      nodeId: node.id,
      done: false,
      history: [
        ...state.history,
        { nodeId: node.id, title: node.title, inject: node.inject, role: node.role, at: new Date().toISOString() },
      ].slice(-MAX_HISTORY),
    };
  }

  try {
    await writeSession(env.TTX_STATE, next);
  } catch {
    return Response.json({ error: "Failed to advance session" }, { status: 500 });
  }
  return Response.json(toResponse(next, scenario));
}

async function handleReset(request: Request, env: TtxEnv): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }

  let body: { sessionId?: unknown };
  try {
    body = (await request.json()) as { sessionId?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId : undefined;
  if (!sessionId) return Response.json({ error: "sessionId is required" }, { status: 400 });

  try {
    await env.TTX_STATE.delete(`${SESSION_PREFIX}${sessionId}`);
  } catch (err) {
    console.error("ttx: failed to reset session", sessionId, err instanceof Error ? err.message : err);
    return Response.json({ error: "Failed to reset session" }, { status: 500 });
  }
  return Response.json({ reset: true });
}

async function handleState(request: Request, env: TtxEnv): Promise<Response> {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) return Response.json({ error: "sessionId is required" }, { status: 400 });

  const state = await readSession(env.TTX_STATE, sessionId);
  if (!state) return Response.json({ error: "Session not found" }, { status: 404 });
  return Response.json(toResponse(state, await getScenarioById(env.TTX_STATE, state.scenarioId)));
}

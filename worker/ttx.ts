// Minimal TTX scenario engine scaffolding (Phase 24) — a single, static,
// hardcoded scenario walked through as a linear phase state machine,
// backed by one KV namespace. This is deliberately NOT the same thing as
// the existing src/operator/ttx/ "TTX SaaS" scaffold (scenario CRUD,
// roles, scoring, injects — still a UI-only scaffold proxied to an Engine
// that doesn't exist yet). That module keeps calling /api/ttx/scenarios,
// /api/ttx/roles, etc. through the Engine proxy exactly as before — this
// file only claims four new, non-overlapping sub-paths (start/next/reset/
// state) and returns null for everything else under /api/ttx/*, so the
// existing fallback is untouched.

export interface TtxEnv {
  TTX_STATE: KVNamespace;
}

interface ScenarioPhase {
  id: string;
  title: string;
  inject: string;
}

// Mirrors src/lib/ttxManifest.ts's TTX_SCENARIO — not imported directly,
// same deliberate small duplication as WebhookEvent/SecurityEvent, since
// the Worker and app are separate TypeScript projects (see
// tsconfig.worker.json's own "include").
const SCENARIO_PHASES: ScenarioPhase[] = [
  { id: "phase1", title: "Initial Inject", inject: "Market volatility begins." },
  { id: "phase2", title: "Escalation", inject: "Liquidity crunch detected." },
  { id: "phase3", title: "Critical Event", inject: "Counterparty default risk rising." },
];

const STATE_KEY = "ttx:state";

interface TtxState {
  phaseIndex: number; // -1 = not started
}

async function readState(kv: KVNamespace): Promise<TtxState> {
  try {
    const raw = await kv.get(STATE_KEY);
    if (!raw) return { phaseIndex: -1 };
    return JSON.parse(raw) as TtxState;
  } catch (err) {
    console.error("ttx: failed to read state", err instanceof Error ? err.message : err);
    return { phaseIndex: -1 };
  }
}

async function writeState(kv: KVNamespace, state: TtxState): Promise<void> {
  try {
    await kv.put(STATE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("ttx: failed to write state", err instanceof Error ? err.message : err);
    throw err;
  }
}

// Single response shape shared by start/next/state — the operator-facing
// cockpit always wants the same "where are we now" view regardless of
// which action produced it.
function phaseResponse(state: TtxState) {
  const total = SCENARIO_PHASES.length;
  if (state.phaseIndex < 0) {
    return { phase: null, title: null, phaseIndex: -1, inject: null, done: false, total };
  }
  if (state.phaseIndex >= total) {
    return { phase: null, title: null, phaseIndex: state.phaseIndex, inject: null, done: true, total };
  }
  const phase = SCENARIO_PHASES[state.phaseIndex];
  return { phase: phase.id, title: phase.title, phaseIndex: state.phaseIndex, inject: phase.inject, done: false, total };
}

export async function handleTtxRoute(request: Request, pathname: string, env: TtxEnv): Promise<Response | null> {
  if (pathname === "/api/ttx/start") return handleStart(request, env);
  if (pathname === "/api/ttx/next") return handleNext(request, env);
  if (pathname === "/api/ttx/reset") return handleReset(request, env);
  if (pathname === "/api/ttx/state") return handleState(request, env);
  return null;
}

async function handleStart(request: Request, env: TtxEnv): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }
  const state: TtxState = { phaseIndex: 0 };
  try {
    await writeState(env.TTX_STATE, state);
  } catch {
    return Response.json({ error: "Failed to start scenario" }, { status: 500 });
  }
  return Response.json(phaseResponse(state));
}

async function handleNext(request: Request, env: TtxEnv): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }
  const current = await readState(env.TTX_STATE);
  if (current.phaseIndex < 0) {
    return Response.json({ error: "Scenario has not been started" }, { status: 400 });
  }
  // Idempotent once done — repeated /next calls after the last phase don't
  // keep incrementing, they just keep returning { done: true }.
  const next: TtxState = { phaseIndex: Math.min(current.phaseIndex + 1, SCENARIO_PHASES.length) };
  try {
    await writeState(env.TTX_STATE, next);
  } catch {
    return Response.json({ error: "Failed to advance scenario" }, { status: 500 });
  }
  return Response.json(phaseResponse(next));
}

async function handleReset(request: Request, env: TtxEnv): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }
  try {
    await env.TTX_STATE.delete(STATE_KEY);
  } catch (err) {
    console.error("ttx: failed to reset state", err instanceof Error ? err.message : err);
    return Response.json({ error: "Failed to reset scenario" }, { status: 500 });
  }
  return Response.json({ reset: true });
}

async function handleState(request: Request, env: TtxEnv): Promise<Response> {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }
  const state = await readState(env.TTX_STATE);
  return Response.json(phaseResponse(state));
}

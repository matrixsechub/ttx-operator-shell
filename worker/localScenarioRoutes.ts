// Scenario authoring routes (Phase 26) — CRUD for operator-authored
// scenarios, stored in the same TTX_STATE KV namespace worker/ttx.ts
// already uses for session state (no new binding, no D1 — same KV-only
// constraint as every other feature in this repo). Authored scenarios use
// the exact same ScenarioDefinition shape as the hardcoded ones in
// scenarioManifest.ts, so the session engine can run either kind without
// special-casing — see getScenarioById below, the single lookup point
// worker/ttx.ts uses for "does this scenario id exist, builtin or
// authored".
//
// Builtin ids (scenarioManifest.ts's SCENARIO_DEFINITIONS) can never be
// created, updated, or deleted here — they're compiled-in, not data.

import { SCENARIO_DEFINITIONS, validateScenarioDefinition, type ScenarioDefinition } from "./scenarioManifest";

export interface LocalScenarioEnv {
  TTX_STATE: KVNamespace;
}

const AUTHORED_PREFIX = "authored:";

async function readAuthoredScenario(kv: KVNamespace, id: string): Promise<ScenarioDefinition | null> {
  try {
    const raw = await kv.get(`${AUTHORED_PREFIX}${id}`);
    if (!raw) return null;
    return JSON.parse(raw) as ScenarioDefinition;
  } catch (err) {
    console.error("localScenarios: failed to read", id, err instanceof Error ? err.message : err);
    return null;
  }
}

export async function listAuthoredScenarios(kv: KVNamespace): Promise<ScenarioDefinition[]> {
  try {
    const listed = await kv.list({ prefix: AUTHORED_PREFIX, limit: 100 });
    const raw = await Promise.all(listed.keys.map((key) => kv.get(key.name)));
    return raw.filter((value): value is string => value !== null).map((value) => JSON.parse(value) as ScenarioDefinition);
  } catch (err) {
    console.error("localScenarios: failed to list", err instanceof Error ? err.message : err);
    return [];
  }
}

// Single lookup point for "does this scenario id exist, builtin or
// authored" — used by worker/ttx.ts's session handlers so a session can
// run either kind interchangeably.
export async function getScenarioById(kv: KVNamespace, id: string): Promise<ScenarioDefinition | null> {
  if (SCENARIO_DEFINITIONS[id]) return SCENARIO_DEFINITIONS[id];
  return readAuthoredScenario(kv, id);
}

export async function handleLocalScenarioRoute(
  request: Request,
  pathname: string,
  env: LocalScenarioEnv,
): Promise<Response | null> {
  if (pathname === "/api/ttx/local-scenarios") return handleList(request, env);
  if (pathname === "/api/ttx/local-scenarios/create") return handleCreate(request, env);
  if (pathname === "/api/ttx/local-scenarios/update") return handleUpdate(request, env);
  if (pathname === "/api/ttx/local-scenarios/delete") return handleDelete(request, env);
  return null;
}

async function handleList(request: Request, env: LocalScenarioEnv): Promise<Response> {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }
  const scenarios = await listAuthoredScenarios(env.TTX_STATE);
  return Response.json({ scenarios });
}

async function handleCreate(request: Request, env: LocalScenarioEnv): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validated = validateScenarioDefinition(body, { requireId: false });
  if (!validated.ok) return Response.json({ error: validated.error }, { status: 400 });

  const scenario: ScenarioDefinition = { ...validated.value, id: crypto.randomUUID() };
  if (SCENARIO_DEFINITIONS[scenario.id]) {
    // Astronomically unlikely (UUID collision with a builtin id), but
    // guard rather than silently shadow a builtin scenario.
    return Response.json({ error: "Generated id collided with a builtin scenario, try again" }, { status: 500 });
  }

  try {
    await env.TTX_STATE.put(`${AUTHORED_PREFIX}${scenario.id}`, JSON.stringify(scenario));
  } catch (err) {
    console.error("localScenarios: failed to create", scenario.id, err instanceof Error ? err.message : err);
    return Response.json({ error: "Failed to create scenario" }, { status: 500 });
  }
  return Response.json({ scenario });
}

async function handleUpdate(request: Request, env: LocalScenarioEnv): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validated = validateScenarioDefinition(body, { requireId: true });
  if (!validated.ok) return Response.json({ error: validated.error }, { status: 400 });

  if (SCENARIO_DEFINITIONS[validated.value.id]) {
    return Response.json({ error: "Cannot update a builtin scenario" }, { status: 400 });
  }
  const existing = await readAuthoredScenario(env.TTX_STATE, validated.value.id);
  if (!existing) return Response.json({ error: "Scenario not found" }, { status: 404 });

  try {
    await env.TTX_STATE.put(`${AUTHORED_PREFIX}${validated.value.id}`, JSON.stringify(validated.value));
  } catch (err) {
    console.error("localScenarios: failed to update", validated.value.id, err instanceof Error ? err.message : err);
    return Response.json({ error: "Failed to update scenario" }, { status: 500 });
  }
  return Response.json({ scenario: validated.value });
}

async function handleDelete(request: Request, env: LocalScenarioEnv): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }

  let body: { id?: unknown };
  try {
    body = (await request.json()) as { id?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : undefined;
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });
  if (SCENARIO_DEFINITIONS[id]) {
    return Response.json({ error: "Cannot delete a builtin scenario" }, { status: 400 });
  }

  try {
    await env.TTX_STATE.delete(`${AUTHORED_PREFIX}${id}`);
  } catch (err) {
    console.error("localScenarios: failed to delete", id, err instanceof Error ? err.message : err);
    return Response.json({ error: "Failed to delete scenario" }, { status: 500 });
  }
  return Response.json({ deleted: true });
}

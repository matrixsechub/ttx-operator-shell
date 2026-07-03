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
//
// Phase 28 adds export/import: GET .../export?id=... produces a signed
// JSON blob for a single authored scenario, POST .../import validates and
// stores one back. Both reuse validateScenarioDefinition (the same strict,
// allow-listed-fields validator create/update already run through) — an
// imported blob has to pass the exact same deterministic-only, no-
// forbidden-fields check as a hand-authored scenario, no separate or
// looser path. The HMAC signature (new optional TTX_EXPORT_SIGNING_KEY
// secret, same optional-secret pattern as WEBHOOK_SECRET/AUTH_SIGNING_KEY)
// catches accidental corruption or manual editing of an exported file
// between export and re-import; it is not a substitute for schema
// validation, which runs regardless of whether the signature checks out.
// Import always mints a fresh id via crypto.randomUUID() — same as create
// — rather than trusting the exported scenarioId, so import can never
// silently overwrite an existing authored scenario (or, trivially, a
// builtin one) by id collision.

import { SCENARIO_DEFINITIONS, validateScenarioDefinition, type ScenarioDefinition } from "./scenarioManifest";

export interface LocalScenarioEnv {
  TTX_STATE: KVNamespace;
  TTX_EXPORT_SIGNING_KEY?: string;
}

const AUTHORED_PREFIX = "authored:";
const EXPORT_VERSION = 1;

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

async function storeAuthoredScenario(kv: KVNamespace, scenario: ScenarioDefinition): Promise<void> {
  await kv.put(`${AUTHORED_PREFIX}${scenario.id}`, JSON.stringify(scenario));
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
  if (pathname === "/api/ttx/local-scenarios/export") return handleExport(request, env);
  if (pathname === "/api/ttx/local-scenarios/import") return handleImport(request, env);
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
    await storeAuthoredScenario(env.TTX_STATE, scenario);
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
    await storeAuthoredScenario(env.TTX_STATE, validated.value);
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

// --- Export / Import (Phase 28) ---

interface ScenarioExportPayload {
  version: number;
  scenarioId: string;
  title: string;
  description?: string;
  roles: string[];
  entry: string;
  nodes: ScenarioDefinition["nodes"];
  exportedAt: string;
  tags?: string[];
  notes?: string;
}

interface ScenarioExportBlob extends ScenarioExportPayload {
  signature: string;
}

const encoder = new TextEncoder();

function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

function hexToBytes(hex: string): Uint8Array | null {
  const matches = hex.match(/../g);
  if (!matches) return null;
  try {
    return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
  } catch {
    return null;
  }
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// Stable string representation independent of object key insertion order —
// signing/verifying JSON.stringify(obj) directly would be fragile (a
// browser download → re-upload round trip, or a hand edit that reorders
// fields without changing content, shouldn't invalidate the signature).
// Array order is preserved as-is (it's meaningful for a node's
// transitions list, even though lookup is by `choice` key, not position).
function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function signPayload(payload: ScenarioExportPayload, secret: string): Promise<string> {
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(canonicalize(payload)));
  return bytesToHex(signature);
}

async function verifyPayloadSignature(payload: ScenarioExportPayload, signatureHex: string, secret: string): Promise<boolean> {
  const signatureBytes = hexToBytes(signatureHex);
  if (!signatureBytes) return false;
  try {
    return await crypto.subtle.verify("HMAC", await hmacKey(secret), signatureBytes, encoder.encode(canonicalize(payload)));
  } catch {
    return false;
  }
}

async function handleExport(request: Request, env: LocalScenarioEnv): Promise<Response> {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }
  if (!env.TTX_EXPORT_SIGNING_KEY) {
    return Response.json({ error: "Scenario export is not configured on this deployment" }, { status: 503 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });
  if (SCENARIO_DEFINITIONS[id]) {
    return Response.json({ error: "Builtin scenarios cannot be exported" }, { status: 400 });
  }

  const scenario = await readAuthoredScenario(env.TTX_STATE, id);
  if (!scenario) return Response.json({ error: "Scenario not found" }, { status: 404 });

  const payload: ScenarioExportPayload = {
    version: EXPORT_VERSION,
    scenarioId: scenario.id,
    title: scenario.title,
    ...(scenario.description ? { description: scenario.description } : {}),
    roles: scenario.roles,
    entry: scenario.entry,
    nodes: scenario.nodes,
    exportedAt: new Date().toISOString(),
    ...(scenario.tags && scenario.tags.length > 0 ? { tags: scenario.tags } : {}),
    ...(scenario.notes ? { notes: scenario.notes } : {}),
  };

  const signature = await signPayload(payload, env.TTX_EXPORT_SIGNING_KEY);
  const blob: ScenarioExportBlob = { ...payload, signature };
  return Response.json(blob);
}

const ALLOWED_EXPORT_FIELDS = new Set([
  "version",
  "scenarioId",
  "title",
  "description",
  "roles",
  "entry",
  "nodes",
  "exportedAt",
  "signature",
  "tags",
  "notes",
]);

async function handleImport(request: Request, env: LocalScenarioEnv): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }
  if (!env.TTX_EXPORT_SIGNING_KEY) {
    return Response.json({ error: "Scenario import is not configured on this deployment" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return Response.json({ error: "Export blob must be an object" }, { status: 400 });
  }
  const record = body as Record<string, unknown>;
  if (!Object.keys(record).every((key) => ALLOWED_EXPORT_FIELDS.has(key))) {
    return Response.json({ error: "Export blob contains unsupported fields" }, { status: 400 });
  }

  const signature = record.signature;
  if (typeof signature !== "string" || !signature.trim()) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }
  if (record.version !== EXPORT_VERSION) {
    return Response.json({ error: "Unsupported export version" }, { status: 400 });
  }

  const { signature: _signature, ...payloadCandidate } = record;
  void _signature;
  const payloadOk = await verifyPayloadSignature(
    payloadCandidate as unknown as ScenarioExportPayload,
    signature,
    env.TTX_EXPORT_SIGNING_KEY,
  );
  if (!payloadOk) {
    return Response.json({ error: "Invalid signature — this export may have been edited or corrupted" }, { status: 400 });
  }

  if (typeof record.scenarioId === "string" && SCENARIO_DEFINITIONS[record.scenarioId]) {
    return Response.json({ error: "Cannot import over a builtin scenario" }, { status: 400 });
  }

  // Same strict validator create/update already run through — an imported
  // scenario has to pass the identical deterministic-only, allow-listed-
  // fields, valid-graph checks as a hand-authored one. requireId: false
  // because import always mints a fresh id below, regardless of what
  // scenarioId was in the blob (see header comment for why).
  const validated = validateScenarioDefinition(
    {
      title: record.title,
      description: record.description,
      roles: record.roles,
      entry: record.entry,
      nodes: record.nodes,
      tags: record.tags,
      notes: record.notes,
    },
    { requireId: false },
  );
  if (!validated.ok) return Response.json({ error: validated.error }, { status: 400 });

  const scenario: ScenarioDefinition = { ...validated.value, id: crypto.randomUUID() };
  if (SCENARIO_DEFINITIONS[scenario.id]) {
    return Response.json({ error: "Generated id collided with a builtin scenario, try again" }, { status: 500 });
  }

  try {
    await storeAuthoredScenario(env.TTX_STATE, scenario);
  } catch (err) {
    console.error("localScenarios: failed to import", scenario.id, err instanceof Error ? err.message : err);
    return Response.json({ error: "Failed to import scenario" }, { status: 500 });
  }
  return Response.json({ scenario });
}

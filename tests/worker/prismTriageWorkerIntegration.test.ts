import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { edgeAuthGate } from "../../worker/edge/gate.ts";
import { classifyRoute } from "../../worker/edge/routeClass.ts";
import { signToken } from "../../worker/edge/crypto.ts";
import { handlePrismTriageRoute } from "../../worker/prismTriageRoutes.ts";
import { generateUiUxAudit } from "../../worker/data/prismUiuxEngine.ts";
import { saveUiUxAudit } from "../../worker/prismUiuxStorage.ts";

const EDGE_SECRET = "test-edge-secret-key-32chars!!";

function createKv() {
  const store = new Map<string, string>();
  return {
    store,
    kv: {
      async get(key: string) {
        return store.get(key) ?? null;
      },
      async put(key: string, value: string) {
        store.set(key, value);
      },
      async delete(key: string) {
        store.delete(key);
      },
      async list() {
        return { keys: [], list_complete: true, cacheStatus: null };
      },
      async getWithMetadata() {
        return { value: null, metadata: null, cacheStatus: null };
      },
    } as unknown as KVNamespace,
  };
}

async function edgeToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return signToken(EDGE_SECRET, { sub: "operator", iat: now, exp: now + 3600 });
}

function workerEnv(kv: KVNamespace) {
  return {
    TTX_STATE: kv,
    AUTH_SIGNING_KEY: EDGE_SECRET,
    OPERATOR_SECRET: EDGE_SECRET,
    AI_FULFILLMENT_ENABLED: "false",
    GOVERNANCE: { getByName: () => ({ fetch: async () => new Response("{}") }) } as DurableObjectNamespace,
    SESSION: { getByName: () => ({ fetch: async () => new Response("{}") }) } as DurableObjectNamespace,
    MARKETPLACE: { getByName: () => ({ fetch: async () => new Response("{}") }) } as DurableObjectNamespace,
    SECURITY_EVENTS: kv,
    WEBHOOK_EVENTS: kv,
    AUTH_REVOCATION: kv,
    DEPLOY_ENV: "development",
    SYSTEM_MODE: "OPERATOR_BETA",
  };
}

const TRIAGE_ROUTES = [
  { method: "GET", path: "/api/operator/uiux/triage" },
  { method: "POST", path: "/api/operator/uiux/triage/generate" },
  { method: "GET", path: "/api/operator/uiux/proposals" },
] as const;

async function routeThroughStack(
  request: Request,
  pathname: string,
  env: ReturnType<typeof workerEnv>,
): Promise<Response | null> {
  const gate = await edgeAuthGate(request, pathname, env);
  if (gate) return gate;
  return handlePrismTriageRoute(request, pathname, env);
}

describe("PRISM triage worker route integration", () => {
  it("classifies all Phase 2D routes as operator-protected", () => {
    for (const route of TRIAGE_ROUTES) {
      assert.equal(classifyRoute(route.path, route.method), "operator");
    }
    assert.equal(classifyRoute("/api/operator/uiux/triage/triage-1/disposition", "POST"), "operator");
    assert.equal(classifyRoute("/api/operator/uiux/triage/triage-1/proposals", "POST"), "operator");
    assert.equal(classifyRoute("/api/operator/uiux/proposals/proposal-1", "GET"), "operator");
  });

  it("denies unauthenticated requests at edge gate before handler", async () => {
    const { kv } = createKv();
    const env = workerEnv(kv);
    const response = await routeThroughStack(
      new Request("https://example.com/api/operator/uiux/triage"),
      "/api/operator/uiux/triage",
      env,
    );
    assert.ok(response);
    assert.equal(response?.status, 401);
  });

  it("runs authenticated triage flow through edge gate + handler", async () => {
    const { kv } = createKv();
    const env = workerEnv(kv);
    const token = await edgeToken();
    const audit = await generateUiUxAudit(
      { mode: "AUDIT_ROUTE", routes: ["/services"], viewport: "mobile", useFixture: true },
      "worker-triage-smoke",
    );
    const sourceHash = audit.evidenceHash;
    await saveUiUxAudit(env, audit);

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const gen = await routeThroughStack(
      new Request("https://example.com/api/operator/uiux/triage/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({ auditId: audit.auditId }),
      }),
      "/api/operator/uiux/triage/generate",
      env,
    );
    assert.ok(gen);
    assert.equal(gen?.status, 200);
    const generated = (await gen.json()) as {
      items: { triageId: string }[];
      sourceAuditUnchanged: boolean;
      mutationAuthorized: false;
      advisoryOnly: true;
    };
    assert.equal(generated.sourceAuditUnchanged, true);
    assert.equal(generated.mutationAuthorized, false);
    assert.equal(generated.advisoryOnly, true);

    const triageId = generated.items[0]!.triageId;
    const gen2 = await routeThroughStack(
      new Request("https://example.com/api/operator/uiux/triage/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({ auditId: audit.auditId }),
      }),
      "/api/operator/uiux/triage/generate",
      env,
    );
    const repeated = (await gen2!.json()) as { items: { triageId: string }[] };
    assert.equal(repeated.items[0]?.triageId, triageId);

    const proposal = await routeThroughStack(
      new Request(`https://example.com/api/operator/uiux/triage/${triageId}/proposals`, {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      }),
      `/api/operator/uiux/triage/${triageId}/proposals`,
      env,
    );
    assert.equal(proposal?.status, 200);
    const proposalBody = (await proposal!.json()) as { proposal: { proposalId: string } };
    const retrieved = await routeThroughStack(
      new Request(`https://example.com/api/operator/uiux/proposals/${proposalBody.proposal.proposalId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      `/api/operator/uiux/proposals/${proposalBody.proposal.proposalId}`,
      env,
    );
    assert.equal(retrieved?.status, 200);

    const rejected = await routeThroughStack(
      new Request(`https://example.com/api/operator/uiux/triage/${triageId}/proposals`, {
        method: "POST",
        headers,
        body: JSON.stringify({ deploy: true }),
      }),
      `/api/operator/uiux/triage/${triageId}/proposals`,
      env,
    );
    assert.equal(rejected?.status, 400);

    const auditRaw = await kv.get(`mshops:uiux:v1:audit:${audit.auditId}`);
    const reloaded = JSON.parse(auditRaw!) as { evidenceHash: string };
    assert.equal(reloaded.evidenceHash, sourceHash);
  });
});

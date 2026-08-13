import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { handleRecommendationRoute } from "../worker/recommendationEngine.ts";
import { handleMarketplaceIntentRoute } from "../worker/marketplaceIntentRouter.ts";
import { handleBlueprintRoute } from "../worker/blueprintGenerator.ts";
import { handleNotificationsRoute, notifyOperator, readRecentNotifications } from "../worker/operatorNotifications.ts";
import { handleQualificationRoute } from "../worker/qualificationRuntime.ts";
import { handleRecoveredFunnelApi } from "../worker/funnelRecovery.ts";
import { writeTier } from "../worker/tierWorker.ts";
import { CATALOG_ITEMS } from "../worker/catalogData.ts";
import { ensureAgentGovernance } from "../msh-ops/agent/initAgentGovernance.ts";
import { ensureBeaconLoaded } from "../msh-ops/beacon/loadBeacon.ts";

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
        return null;
      },
    } as unknown as KVNamespace,
  };
}

const SESSION = "6f9619ff-8b86-4d01-b42d-00cf4fc964ff";

function post(path: string, body: unknown): Request {
  return new Request(`https://x${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function registerCapture(kv: KVNamespace): Promise<string> {
  const request = post("/api/register", { name: "T", email: "t@example.com", role: "onboarding", reason: "t" });
  const response = (await handleRecoveredFunnelApi(request, new URL(request.url), { TTX_STATE: kv })) as Response;
  return ((await response.json()) as { register_id: string }).register_id;
}

async function pushEvidence(kv: KVNamespace, captureId: string, kind: string, data: Record<string, unknown>) {
  await handleQualificationRoute(post("/api/qualification/evidence", { captureId, kind, data }), "/api/qualification/evidence", {
    TTX_STATE: kv,
  });
}

describe("autonomy routes", () => {
  before(async () => {
    await ensureBeaconLoaded();
    await ensureAgentGovernance();
  });

  it("evaluate: anonymous ACCESS subject with no capture gets continue-onboarding", async () => {
    const { kv } = createKv();
    const response = (await handleRecommendationRoute(
      post("/api/recommendation/evaluate", { sessionId: SESSION }),
      "/api/recommendation/evaluate",
      { TTX_STATE: kv },
    )) as Response;
    assert.equal(response.status, 200);
    const payload = (await response.json()) as { subject: string; nextAction: string; recommendedTier: string };
    assert.equal(payload.subject, `anon:${SESSION}`);
    assert.equal(payload.nextAction, "continue-onboarding");
    assert.equal(payload.recommendedTier, "access");
  });

  it("evaluate: captured + routed prospect gets an upgrade recommendation", async () => {
    const { kv } = createKv();
    const captureId = await registerCapture(kv);
    await pushEvidence(kv, captureId, "surface_visit", { page: "/onboarding" });
    await pushEvidence(kv, captureId, "answer", { questionId: "objective", answer: "security" });
    await pushEvidence(kv, captureId, "route_shown", { recommendedPath: "cybersecurity", recommendedTier: "operator" });

    const response = (await handleRecommendationRoute(
      post("/api/recommendation/evaluate", { sessionId: SESSION, captureId }),
      "/api/recommendation/evaluate",
      { TTX_STATE: kv },
    )) as Response;
    const payload = (await response.json()) as { recommendedTier: string; nextAction: string; advisor: { eligible: boolean } };
    assert.equal(payload.recommendedTier, "operator");
    assert.equal(payload.nextAction, "upgrade-tier");
    assert.equal(payload.advisor.eligible, true);
  });

  it("intent: acquire routes to m3-purchase when tier suffices, tier-upgrade when gated", async () => {
    const { kv } = createKv();
    const scenarioItem = CATALOG_ITEMS.find((item) => item.tags?.includes("scenario-pack"));
    assert.ok(scenarioItem);

    const gated = (await handleMarketplaceIntentRoute(
      post("/api/marketplace/intent", { intent: "acquire", itemId: scenarioItem.id, sessionId: SESSION }),
      "/api/marketplace/intent",
      { TTX_STATE: kv },
    )) as Response;
    const gatedPayload = (await gated.json()) as { route: string; requiresTier?: string };
    assert.equal(gatedPayload.route, "tier-upgrade");
    assert.equal(gatedPayload.requiresTier, "operator");

    await writeTier({ TTX_STATE: kv }, `anon:${SESSION}`, "operator");
    const eligible = (await handleMarketplaceIntentRoute(
      post("/api/marketplace/intent", { intent: "acquire", itemId: scenarioItem.id, sessionId: SESSION }),
      "/api/marketplace/intent",
      { TTX_STATE: kv },
    )) as Response;
    const eligiblePayload = (await eligible.json()) as { route: string; target: string };
    assert.equal(eligiblePayload.route, "m3-purchase");
    assert.equal(eligiblePayload.target, scenarioItem.id);
  });

  it("intent: records marketplace intent as qualification evidence and notifies", async () => {
    const { kv, store } = createKv();
    const captureId = await registerCapture(kv);
    await pushEvidence(kv, captureId, "surface_visit", { page: "/marketplace" });

    const response = (await handleMarketplaceIntentRoute(
      post("/api/marketplace/intent", { intent: "refine", captureId, sessionId: SESSION }),
      "/api/marketplace/intent",
      { TTX_STATE: kv },
    )) as Response;
    const payload = (await response.json()) as { route: string; target: string };
    assert.equal(payload.route, "blueprint-refinement");
    assert.equal(payload.target, "/onboarding");

    // Evidence recorded (answer:marketplace_intent) → stage now QUALIFY.
    const state = (await handleQualificationRoute(
      new Request(`https://x/api/qualification/state?captureId=${captureId}`),
      "/api/qualification/state",
      { TTX_STATE: kv },
    )) as Response;
    assert.equal(((await state.json()) as { stage: string }).stage, "QUALIFY");

    // Notification ring log carries the intent event.
    const log = JSON.parse(store.get("pearl:notifications:log") as string) as { kind: string }[];
    assert.ok(log.some((event) => event.kind === "marketplace-intent"));
  });

  it("intent: no capture routes to onboarding continuation (Option B)", async () => {
    const { kv } = createKv();
    const response = (await handleMarketplaceIntentRoute(
      post("/api/marketplace/intent", { intent: "upgrade", sessionId: SESSION }),
      "/api/marketplace/intent",
      { TTX_STATE: kv },
    )) as Response;
    const payload = (await response.json()) as { route: string };
    assert.equal(payload.route, "onboarding-continuation");
  });

  it("blueprint: assembles mission/objective/tier/next steps from evidence", async () => {
    const { kv } = createKv();
    const captureId = await registerCapture(kv);
    await pushEvidence(kv, captureId, "surface_visit", { page: "/onboarding" });
    await pushEvidence(kv, captureId, "answer", { questionId: "objective", answer: "security" });
    await pushEvidence(kv, captureId, "route_shown", { recommendedPath: "cybersecurity", recommendedTier: "operator" });

    const response = (await handleBlueprintRoute(
      new Request(`https://x/api/blueprint?captureId=${captureId}&sessionId=${SESSION}`),
      "/api/blueprint",
      { TTX_STATE: kv },
    )) as Response;
    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      blueprint: { mission: string; objective: string; recommendedTier: string; nextSteps: string[] };
    };
    assert.equal(payload.blueprint.mission, "cybersecurity");
    assert.equal(payload.blueprint.objective, "security");
    assert.equal(payload.blueprint.recommendedTier, "operator");
    assert.ok(payload.blueprint.nextSteps.length > 0);
  });

  it("blueprint: 404 for unknown captures", async () => {
    const { kv } = createKv();
    const response = (await handleBlueprintRoute(
      new Request("https://x/api/blueprint?captureId=reg_unknown"),
      "/api/blueprint",
      { TTX_STATE: kv },
    )) as Response;
    assert.equal(response.status, 404);
  });

  it("notifications: ring log persists, recent endpoint reads, unset URL means no egress", async () => {
    const { kv } = createKv();
    const originalFetch = globalThis.fetch;
    let egressAttempted = false;
    globalThis.fetch = (async () => {
      egressAttempted = true;
      return new Response("{}");
    }) as typeof fetch;
    try {
      await notifyOperator({ TTX_STATE: kv }, { kind: "tier-upgrade", subject: "op", data: { previous: "access", tier: "operator" } });
    } finally {
      globalThis.fetch = originalFetch;
    }
    assert.equal(egressAttempted, false, "no egress when N8N_NOTIFY_WEBHOOK_URL is unset");

    const events = await readRecentNotifications({ TTX_STATE: kv });
    assert.equal(events.length, 1);
    assert.equal(events[0].kind, "tier-upgrade");

    const response = (await handleNotificationsRoute(
      new Request("https://x/api/notifications/recent"),
      "/api/notifications/recent",
      { TTX_STATE: kv },
    )) as Response;
    const payload = (await response.json()) as { events: unknown[]; egressConfigured: boolean };
    assert.equal(payload.events.length, 1);
    assert.equal(payload.egressConfigured, false);
  });

  it("notifications: configured URL dispatches a signed POST", async () => {
    const { kv } = createKv();
    const originalFetch = globalThis.fetch;
    let captured: { url: string; signature: string | null } | null = null;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      captured = {
        url: String(input),
        signature: (init?.headers as Record<string, string>)?.["X-Pearl-Signature"] ?? null,
      };
      return new Response("{}");
    }) as typeof fetch;
    try {
      await notifyOperator(
        { TTX_STATE: kv, N8N_NOTIFY_WEBHOOK_URL: "https://n8n.example/hook", N8N_NOTIFY_SECRET: "secret" },
        { kind: "qualify-reached", captureId: "reg_x" },
      );
      // fire-and-forget: give the microtask a beat
      await new Promise((resolve) => setTimeout(resolve, 10));
    } finally {
      globalThis.fetch = originalFetch;
    }
    assert.ok(captured, "egress attempted when configured");
    assert.equal(captured!.url, "https://n8n.example/hook");
    assert.match(captured!.signature ?? "", /^[0-9a-f]{64}$/);
  });
});

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { handleQualificationRoute } from "../worker/qualificationRuntime.ts";
import { handleRecoveredFunnelApi } from "../worker/funnelRecovery.ts";
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

async function registerCapture(kv: KVNamespace): Promise<string> {
  const request = new Request("https://x/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test", email: "test@example.com", role: "onboarding", reason: "test" }),
  });
  const response = (await handleRecoveredFunnelApi(request, new URL(request.url), { TTX_STATE: kv })) as Response;
  const payload = (await response.json()) as { register_id: string };
  return payload.register_id;
}

function evidenceRequest(body: unknown): Request {
  return new Request("https://x/api/qualification/evidence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("qualification runtime endpoints", () => {
  before(async () => {
    await ensureBeaconLoaded();
    await ensureAgentGovernance();
  });

  it("rejects evidence for a capture that does not exist (Option B anchor)", async () => {
    const { kv } = createKv();
    const response = (await handleQualificationRoute(
      evidenceRequest({ captureId: "reg_does_not_exist", kind: "surface_visit", data: { page: "/onboarding" } }),
      "/api/qualification/evidence",
      { TTX_STATE: kv },
    )) as Response;
    assert.equal(response.status, 404);
  });

  it("anchors the lifecycle on the register record and walks the ladder", async () => {
    const { kv } = createKv();
    const captureId = await registerCapture(kv);

    const visit = (await handleQualificationRoute(
      evidenceRequest({ captureId, kind: "surface_visit", data: { page: "/onboarding" } }),
      "/api/qualification/evidence",
      { TTX_STATE: kv },
    )) as Response;
    assert.equal(visit.status, 201);
    const afterVisit = (await visit.json()) as { stage: string; voice: string };
    assert.equal(afterVisit.stage, "EXPERIENCE");
    assert.equal(afterVisit.voice, "ghost");

    await handleQualificationRoute(
      evidenceRequest({ captureId, kind: "answer", data: { questionId: "objective", answer: "security" } }),
      "/api/qualification/evidence",
      { TTX_STATE: kv },
    );
    const route = (await handleQualificationRoute(
      evidenceRequest({
        captureId,
        kind: "route_shown",
        data: { recommendedPath: "cybersecurity", recommendedTier: "operator" },
      }),
      "/api/qualification/evidence",
      { TTX_STATE: kv },
    )) as Response;
    const afterRoute = (await route.json()) as { stage: string; voice: string };
    assert.equal(afterRoute.stage, "ROUTE");
    assert.equal(afterRoute.voice, "beacon");

    const state = (await handleQualificationRoute(
      new Request(`https://x/api/qualification/state?captureId=${captureId}`),
      "/api/qualification/state",
      { TTX_STATE: kv },
    )) as Response;
    const payload = (await state.json()) as { stage: string; payload: { recommendedPath: string } };
    assert.equal(payload.stage, "ROUTE");
    assert.equal(payload.payload.recommendedPath, "cybersecurity");
  });

  it("rejects malformed evidence payloads", async () => {
    const { kv } = createKv();
    const captureId = await registerCapture(kv);
    const response = (await handleQualificationRoute(
      evidenceRequest({ captureId, kind: "answer", data: {} }), // no questionId
      "/api/qualification/evidence",
      { TTX_STATE: kv },
    )) as Response;
    assert.equal(response.status, 400);
  });
});

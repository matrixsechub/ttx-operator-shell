import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  grantPack,
  handleEntitlementsRoute,
  packKindFromTags,
  resolveEntitlements,
  TIER_BASELINES,
} from "../worker/entitlementsWorker.ts";
import { handleTierRoute, readTier, writeTier } from "../worker/tierWorker.ts";

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

describe("entitlement resolution (pure)", () => {
  it("access baseline is browse+join only, deny-by-default", () => {
    const resolved = resolveEntitlements("anon:x", "access", null);
    assert.deepEqual(resolved.effective, ["public.browse", "ttx.join"]);
    assert.equal(resolved.effective.includes("marketplace.acquire"), false);
  });

  it("effective = tier baseline ∪ active pack grants", () => {
    const resolved = resolveEntitlements("op", "operator", {
      packs: [{ kind: "scenario-pack", slug: "vol2", grantedAt: "2026-01-01" }],
      revocations: [],
    });
    for (const grant of TIER_BASELINES.operator) {
      assert.ok(resolved.effective.includes(grant), grant);
    }
    assert.ok(resolved.effective.includes("ttx.scenarios.vol2"));
    assert.equal(resolved.latent.length, 0);
  });

  it("packs below their minimumTier stay LATENT (downgrades non-destructive)", () => {
    const resolved = resolveEntitlements("op", "access", {
      packs: [{ kind: "agent-pack", slug: "intake", grantedAt: "2026-01-01" }],
      revocations: [],
    });
    assert.equal(resolved.effective.includes("agents.intake.use"), false);
    assert.deepEqual(resolved.latent, [{ grant: "agents.intake.use", requiresTier: "operator" }]);
  });

  it("intelligence packs require ops-division", () => {
    const atOperator = resolveEntitlements("op", "operator", {
      packs: [{ kind: "intelligence-pack", slug: "threat-feed", grantedAt: "2026-01-01" }],
      revocations: [],
    });
    assert.equal(atOperator.effective.includes("intel.threat-feed.read"), false);
    const atDivision = resolveEntitlements("op", "ops-division", {
      packs: [{ kind: "intelligence-pack", slug: "threat-feed", grantedAt: "2026-01-01" }],
      revocations: [],
    });
    assert.ok(atDivision.effective.includes("intel.threat-feed.read"));
  });

  it("revocations beat grants", () => {
    const resolved = resolveEntitlements("op", "operator", {
      packs: [{ kind: "agent-pack", slug: "intake", grantedAt: "2026-01-01" }],
      revocations: ["agents.intake.use"],
    });
    assert.equal(resolved.effective.includes("agents.intake.use"), false);
  });
});

describe("pack-family mapping from catalog tags", () => {
  it("maps declarative pack-family tags and rejects others", () => {
    assert.equal(packKindFromTags(["featured", "scenario-pack"]), "scenario-pack");
    assert.equal(packKindFromTags(["gear"]), null);
    assert.equal(packKindFromTags(undefined), null);
  });
});

describe("grantPack (single writer)", () => {
  it("is idempotent per acquisitionId and per kind+slug", async () => {
    const { kv } = createKv();
    await grantPack(kv, "op", { kind: "agent-pack", slug: "intake", grantedAt: "t", acquisitionId: "a1" });
    await grantPack(kv, "op", { kind: "agent-pack", slug: "intake", grantedAt: "t", acquisitionId: "a1" });
    const record = JSON.parse((await kv.get("pearl:entitlements:op")) as string);
    assert.equal(record.packs.length, 1);
  });
});

describe("tier persistence", () => {
  it("unknown subjects default to access", async () => {
    const { kv } = createKv();
    assert.equal(await readTier({ TTX_STATE: kv }, "nobody"), "access");
  });

  it("writes and reads the ladder", async () => {
    const { kv } = createKv();
    await writeTier({ TTX_STATE: kv }, "op", "ops-division");
    assert.equal(await readTier({ TTX_STATE: kv }, "op"), "ops-division");
  });
});

describe("tier + entitlement endpoints", () => {
  it("GET /api/tier/get resolves anonymous session subjects", async () => {
    const { kv } = createKv();
    const request = new Request(
      "https://x/api/tier/get?sessionId=6f9619ff-8b86-4d01-b42d-00cf4fc964ff",
    );
    const response = (await handleTierRoute(request, "/api/tier/get", { TTX_STATE: kv })) as Response;
    const payload = (await response.json()) as { subject: string; tier: string };
    assert.equal(payload.tier, "access");
    assert.equal(payload.subject, "anon:6f9619ff-8b86-4d01-b42d-00cf4fc964ff");
  });

  it("POST /api/tier/set requires operator auth", async () => {
    const { kv } = createKv();
    const request = new Request("https://x/api/tier/set", {
      method: "POST",
      body: JSON.stringify({ subject: "op", tier: "operator" }),
    });
    const response = (await handleTierRoute(request, "/api/tier/set", { TTX_STATE: kv })) as Response;
    assert.equal(response.status, 401);
  });

  it("GET /api/entitlements/resolve returns the access baseline for anonymous", async () => {
    const { kv } = createKv();
    const request = new Request("https://x/api/entitlements/resolve");
    const response = (await handleEntitlementsRoute(request, "/api/entitlements/resolve", {
      TTX_STATE: kv,
    })) as Response;
    const payload = (await response.json()) as { subject: string; tier: string; effective: string[] };
    assert.equal(payload.subject, "anonymous");
    assert.equal(payload.tier, "access");
    assert.deepEqual(payload.effective, ["public.browse", "ttx.join"]);
  });

  it("GET /api/entitlements/get requires operator auth", async () => {
    const { kv } = createKv();
    const request = new Request("https://x/api/entitlements/get");
    const response = (await handleEntitlementsRoute(request, "/api/entitlements/get", {
      TTX_STATE: kv,
    })) as Response;
    assert.equal(response.status, 401);
  });
});

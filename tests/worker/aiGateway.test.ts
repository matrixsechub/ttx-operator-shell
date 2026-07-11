import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import { ensureAgentGovernance, getAgentGovernanceContext } from "../../msh-ops/agent/initAgentGovernance.ts";
import { ensureBeaconLoaded } from "../../msh-ops/beacon/loadBeacon.ts";
import { runGovernedInference } from "../../worker/aiGateway.ts";

describe("aiGateway governance", () => {
  let ctx: ReturnType<typeof getAgentGovernanceContext>;

  before(async () => {
    await ensureBeaconLoaded();
    await ensureAgentGovernance();
    ctx = getAgentGovernanceContext();
  });

  it("denies mutate_state without operator approval", async () => {
    const env = { TTX_STATE: createMockKv() } as import("../../worker/aiGateway.ts").AiGatewayEnv;
    const outcome = await runGovernedInference(
      env,
      { ...ctx, agentId: "GuideAgent" },
      {
        agentId: "GuideAgent",
        actionKind: "mutate_state",
        description: "test mutate",
        axis: "STABILITY",
      },
      {
        messages: [{ role: "user", content: "hello" }],
        surface: "cockpit",
      },
      { mode: "standard", wildcardFeaturesEnabled: true },
    );
    assert.equal(outcome.ok, false);
    if (!outcome.ok) {
      assert.equal(outcome.code, "BEACON_AUTONOMY_ESCALATE");
    }
  });

  it("returns unavailable when AI binding and token are missing", async () => {
    const env = { TTX_STATE: createMockKv() } as import("../../worker/aiGateway.ts").AiGatewayEnv;
    const outcome = await runGovernedInference(
      env,
      { ...ctx, agentId: "GuideAgent" },
      {
        agentId: "GuideAgent",
        actionKind: "advisory",
        description: "test advisory",
        axis: "STABILITY",
      },
      {
        messages: [{ role: "user", content: "hello" }],
        surface: "cockpit",
      },
      { mode: "standard", wildcardFeaturesEnabled: true },
    );
    assert.equal(outcome.ok, false);
    if (!outcome.ok) {
      assert.equal(outcome.code, "AI_GATEWAY_UNAVAILABLE");
    }
  });
});

function createMockKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
    delete: async () => {},
    list: async () => ({ keys: [], list_complete: true, cacheStatus: null }),
    getWithMetadata: async (key: string) => ({ value: store.get(key) ?? null, metadata: null, cacheStatus: null }),
  } as unknown as KVNamespace;
}

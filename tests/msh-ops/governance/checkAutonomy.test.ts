import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import northstarDocument from "../../../msh-ops/beacon/northstar.json" with { type: "json" };
import { ensureAgentGovernance, getAgentGovernanceContext, initAgentGovernance } from "../../../msh-ops/agent/initAgentGovernance.ts";
import { ensureBeaconLoaded } from "../../../msh-ops/beacon/loadBeacon.ts";
import { checkAutonomy } from "../../../msh-ops/governance/checkAutonomy.ts";

describe("checkAutonomy", () => {
  let ctx: ReturnType<typeof getAgentGovernanceContext>;

  before(async () => {
    await ensureBeaconLoaded();
    await ensureAgentGovernance();
    ctx = getAgentGovernanceContext();
  });

  it("allows advisory actions with a valid beacon", () => {
    const result = checkAutonomy(
      {
        agentId: "AiAgentBuilderAgent",
        actionKind: "advisory",
        description: "Suggest build spec",
        axis: "TRUST",
      },
      { ...ctx, agentId: "AiAgentBuilderAgent" },
    );
    assert.equal(result.decision, "allowed");
  });

  it("denies autonomous execution without operator approval", () => {
    const result = checkAutonomy(
      {
        agentId: "AiAgentBuilderAgent",
        actionKind: "autonomous_execute",
        description: "Execute tool action",
        axis: "CONTROLLED_GROWTH",
      },
      { ...ctx, agentId: "AiAgentBuilderAgent" },
    );
    assert.equal(result.decision, "denied");
  });

  it("escalates mutate_state without approval and allows with approval", () => {
    const denied = checkAutonomy(
      {
        agentId: "AiAgentBuilderAgent",
        actionKind: "mutate_state",
        description: "Record queue entry",
        axis: "STABILITY",
      },
      { ...ctx, agentId: "AiAgentBuilderAgent" },
    );
    assert.equal(denied.decision, "escalate");

    const allowed = checkAutonomy(
      {
        agentId: "AiAgentBuilderAgent",
        actionKind: "mutate_state",
        description: "Record queue entry",
        axis: "STABILITY",
        operatorApproval: true,
      },
      { ...ctx, agentId: "AiAgentBuilderAgent" },
    );
    assert.equal(allowed.decision, "allowed");
  });

  it("denies non-advisory actions in safe mode", async () => {
    const safe = await import("../../../msh-ops/beacon/loadBeacon.ts").then((mod) =>
      mod.loadBeaconFromPayload(
        { ...northstarDocument, mandate: `${northstarDocument.mandate} changed` },
        { allowSafeMode: true },
      ),
    );
    const safeCtx = {
      agentId: "AiAgentBuilderAgent",
      beacon: safe.beacon,
      integrityHash: safe.integrityHash,
      safeMode: true,
      warning: safe.warning,
    };
    const advisory = checkAutonomy(
      {
        agentId: "AiAgentBuilderAgent",
        actionKind: "advisory",
        description: "Advisory suggestion",
        axis: "STABILITY",
      },
      safeCtx,
    );
    assert.equal(advisory.decision, "allowed");

    const blocked = checkAutonomy(
      {
        agentId: "AiAgentBuilderAgent",
        actionKind: "mutate_state",
        description: "Queue write",
        axis: "STABILITY",
        operatorApproval: true,
      },
      safeCtx,
    );
    assert.equal(blocked.decision, "denied");
    assert.match(blocked.reason, /safe mode/i);
  });
});

describe("initAgentGovernance", () => {
  before(async () => {
    await ensureBeaconLoaded();
  });

  it("returns cached governance context for agents", () => {
    const first = initAgentGovernance("AiAgentBuilderAgent");
    const second = initAgentGovernance("SecurityRemediationAgent");
    assert.equal(first.integrityHash, second.integrityHash);
    assert.equal(first.beacon.id, "BEACON::NORTHSTAR");
    assert.equal(second.agentId, "SecurityRemediationAgent");
  });
});

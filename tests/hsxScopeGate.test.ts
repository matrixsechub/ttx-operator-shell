import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeCodexManifestHash } from "../worker/codex/manifestHash.ts";
import { getActiveBeaconHash } from "../worker/governance/beaconContext.ts";
import { computeProposalActionDigest } from "../worker/governance/proposalActionDigest.ts";
import { saveApprovalReceipt, saveProposal } from "../worker/governance/proposalStore.ts";
import { signApprovalReceipt } from "../worker/governance/receiptCrypto.ts";
import {
  GOVERNANCE_RECEIPT_DOMAIN,
  GOVERNANCE_RECEIPT_KEY_ID,
} from "../worker/governance/signingKeys.ts";
import { evaluateHsxScopeGate, executeWithHsxScopeGate } from "../worker/hsxScopeGate/gate.ts";
import { handleHsxScopeGateRoute } from "../worker/hsxScopeGate/route.ts";
import { assessHsxActionRisk } from "../worker/hsxScopeGate/risk.ts";
import { validateHsxScopeGatePacket } from "../worker/hsxScopeGate/schema.ts";
import type { HsxScopeGatePacket } from "../worker/hsxScopeGate/types.ts";
import { runHsxScopeGatePreExecution } from "../n8n/hooks/hsx-scope-gate-pre-execution.mjs";

function mockKv() {
  const store = new Map<string, string>();
  const kv = {
    async get(key: string) { return store.get(key) ?? null; },
    async put(key: string, value: string) { store.set(key, value); },
    async delete(key: string) { store.delete(key); },
    async list() { return { keys: [], list_complete: true, cacheStatus: null }; },
    async getWithMetadata() { return null; },
  } as unknown as KVNamespace;
  return { kv, store };
}

const signingKey = "test-signing-key";

function envFor(kv: KVNamespace) {
  return {
    TTX_STATE: kv,
    AUTH_REVOCATION: kv,
    AUTH_SIGNING_KEY: signingKey,
    GOVERNANCE_RECEIPT_SIGNING_KEY: signingKey,
    BEACON_SIGNING_KEY: signingKey,
    N8N_WEBHOOK_SECRET: "n8n-test-secret",
    DEPLOY_ENV: "development",
  };
}

function packet(overrides: Partial<HsxScopeGatePacket> = {}): HsxScopeGatePacket {
  return {
    version: "hsx.scope-gate.v1",
    packet_id: crypto.randomUUID(),
    correlation_id: crypto.randomUUID(),
    issued_at: new Date().toISOString(),
    actor: { id: "agent-test", type: "agent", roles: ["diagnostic"] },
    target: { system: "engine", resource: "service/demo", environment: "development" },
    action: { type: "engine.inspect", class: "C0", operation: "read", permissions: ["engine:read"], payload: {} },
    engagement: {
      id: "eng-test",
      scope_id: "scope-test",
      authorized_targets: ["engine:service/*"],
      allowed_actions: ["engine.inspect"],
      allowed_permissions: ["engine:read"],
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    },
    evidence: [],
    ...overrides,
  };
}

describe("HSX scope gate schema and risk", () => {
  it("rejects unknown fields and malformed packets", () => {
    const value = { ...packet(), bypass_governance: true };
    const result = validateHsxScopeGatePacket(value);
    assert.equal(result.valid, false);
    if (!result.valid) assert.ok(result.errors.some((error) => error.includes("bypass_governance")));
  });

  it("scores production deploys as critical", () => {
    const value = packet({
      target: { system: "engine", resource: "service/demo", environment: "production" },
      action: { type: "engine.deploy", class: "C5", operation: "deploy", permissions: ["deploy:production"], payload: {} },
    });
    const risk = assessHsxActionRisk(value);
    assert.equal(risk.score, 100);
    assert.equal(risk.tier, "critical");
    assert.equal(risk.evidence_required, true);
  });
});

describe("HSX scope gate enforcement", () => {
  it("approves an authorized C0 read and writes approval plus telemetry records", async () => {
    const { kv, store } = mockKv();
    const result = await evaluateHsxScopeGate(envFor(kv), packet());
    assert.equal(result.outcome, "approved");
    assert.equal(result.reason_code, "SCOPE_GATE_APPROVED");
    assert.ok([...store.keys()].some((key) => key.includes(":approved:")));
    assert.ok([...store.keys()].some((key) => key.includes(":telemetry:")));
  });

  it("denies unauthorized targets", async () => {
    const { kv } = mockKv();
    const value = packet({
      engagement: { ...packet().engagement, authorized_targets: ["billing:*"] },
    });
    const result = await evaluateHsxScopeGate(envFor(kv), value);
    assert.equal(result.outcome, "denied");
    assert.equal(result.reason_code, "TARGET_UNAUTHORIZED");
  });

  it("denies permissions outside engagement scope", async () => {
    const { kv } = mockKv();
    const value = packet({
      action: { ...packet().action, permissions: ["engine:write"] },
    });
    const result = await evaluateHsxScopeGate(envFor(kv), value);
    assert.equal(result.reason_code, "PERMISSION_DENIED");
  });

  it("requires evidence for high-risk actions before checking approval", async () => {
    const { kv } = mockKv();
    const value = packet({
      target: { system: "engine", resource: "service/demo", environment: "development" },
      action: { type: "engine.deploy", class: "C5", operation: "deploy", permissions: ["deploy:production"], payload: { release: "v1" } },
      engagement: {
        ...packet().engagement,
        allowed_actions: ["engine.deploy"],
        allowed_permissions: ["deploy:production"],
      },
    });
    const result = await evaluateHsxScopeGate(envFor(kv), value);
    assert.equal(result.reason_code, "EVIDENCE_REQUIRED");
  });

  it("fails closed when signed Beacon v2 is unavailable", async () => {
    const { kv } = mockKv();
    const result = await evaluateHsxScopeGate({ ...envFor(kv), BEACON_SIGNING_KEY: undefined }, packet());
    assert.equal(result.outcome, "denied");
    assert.equal(result.reason_code, "SIGNED_BEACON_NOT_ACTIVE");
  });

  it("validates a C3 receipt against proposal, payload, Beacon, and Codex", async () => {
    const { kv } = mockKv();
    const env = envFor(kv);
    const beaconHash = (await getActiveBeaconHash(env)).hash;
    const codexHash = await computeCodexManifestHash();
    const mutationPayload = { name: "demo" };
    const proposal = await saveProposal(env, {
      proposal_id: crypto.randomUUID(),
      revision: 1,
      created_by: "operator",
      created_at: new Date().toISOString(),
      target_system: "engine",
      action_class: "C3",
      summary: "Execute governed engine change",
      intended_outcome: "Validate scope gate receipt enforcement",
      northstar_impact: { stability: "primary", revenue_validation: "neutral", trust: "neutral", controlled_growth: "neutral", wildcard_innovation: "neutral" },
      evidence_refs: [],
      risk_score: { numeric: 45, qualitative: "medium" },
      rollback_plan: "Restore prior engine state",
      affected_data: [],
      affected_users: "internal",
      required_approver: "operator",
      beacon_hash: beaconHash,
      codex_hash: codexHash,
      expiration: new Date(Date.now() + 60_000).toISOString(),
      status: "approved",
      action_payload: { actionType: "engine.update", mutationPayload },
    });
    const unsigned = {
      approvalId: crypto.randomUUID(),
      proposalId: proposal.proposal_id,
      proposalRevision: proposal.revision,
      actionClass: proposal.action_class,
      actionDigest: await computeProposalActionDigest(proposal, "development"),
      beaconHash,
      codexHash,
      targetEnvironment: "development" as const,
      approvedBy: "operator",
      approvedAt: new Date().toISOString(),
      expiresAt: proposal.expiration,
      nonce: crypto.randomUUID(),
    };
    const signature = await signApprovalReceipt(unsigned, {
      key: signingKey,
      keyId: GOVERNANCE_RECEIPT_KEY_ID,
      domain: GOVERNANCE_RECEIPT_DOMAIN,
      source: "governance",
    });
    await saveApprovalReceipt(env, { ...unsigned, signature });
    const result = await evaluateHsxScopeGate(env, packet({
      action: { type: "engine.update", class: "C3", operation: "update", permissions: ["engine:write"], payload: mutationPayload },
      engagement: { ...packet().engagement, allowed_actions: ["engine.update"], allowed_permissions: ["engine:write"] },
      approval: { proposal_id: proposal.proposal_id, approval_id: unsigned.approvalId },
    }));
    assert.equal(result.outcome, "approved");
    assert.equal(result.approval_verified, true);
  });

  it("blocks duplicate packet ids", async () => {
    const { kv } = mockKv();
    const env = envFor(kv);
    const value = packet();
    assert.equal((await evaluateHsxScopeGate(env, value)).outcome, "approved");
    assert.equal((await evaluateHsxScopeGate(env, value)).reason_code, "PACKET_REPLAYED");
  });

  it("never invokes an action callback after a denial", async () => {
    const { kv } = mockKv();
    let executed = false;
    const result = await executeWithHsxScopeGate(
      envFor(kv),
      packet({ engagement: { ...packet().engagement, authorized_targets: ["billing:*"] } }),
      async () => {
        executed = true;
        return { changed: true };
      },
    );
    assert.equal(result.ok, false);
    assert.equal(executed, false);
  });
});

describe("HSX Worker route and n8n hook", () => {
  it("requires route authentication", async () => {
    const { kv } = mockKv();
    const response = await handleHsxScopeGateRoute(
      new Request("https://example.com/api/governance/hsx/scope-gate/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(packet()),
      }),
      "/api/governance/hsx/scope-gate/evaluate",
      envFor(kv),
    );
    assert.equal(response?.status, 401);
  });

  it("lets n8n continue only on an approved Worker decision", async () => {
    const approved = await runHsxScopeGatePreExecution({
      workerBaseUrl: "https://example.com",
      secret: "secret",
      packet: packet(),
      fetchImpl: async () => Response.json({ decision: { outcome: "approved", reason_code: "SCOPE_GATE_APPROVED" } }),
    });
    assert.equal(approved.scopeGateDecision.outcome, "approved");
    await assert.rejects(
      runHsxScopeGatePreExecution({
        workerBaseUrl: "https://example.com",
        secret: "secret",
        packet: packet(),
        fetchImpl: async () => Response.json({ decision: { outcome: "denied", reason_code: "TARGET_UNAUTHORIZED" } }, { status: 403 }),
      }),
      /HSX_SCOPE_GATE_DENIED:TARGET_UNAUTHORIZED/,
    );
  });
});

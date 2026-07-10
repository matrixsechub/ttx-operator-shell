import assert from "node:assert/strict";
import { describe, it, before, beforeEach } from "node:test";
import { ensureBeaconLoaded } from "../msh-ops/beacon/loadBeacon.ts";
import { resolveBeaconRuntimeState } from "../worker/governance/beaconRuntime.ts";
import { evaluateLegacyOperatorApproval } from "../worker/governance/legacyApproval.ts";
import { verifyApprovalForExecution } from "../worker/governance/approvalVerifier.ts";
import { runGovernedMutation } from "../worker/governance/governedMutation.ts";
import { signApprovalReceipt } from "../worker/governance/receiptCrypto.ts";
import { saveProposal, saveApprovalReceipt, getProposal } from "../worker/governance/proposalStore.ts";
import { handleBeaconRoute } from "../worker/beaconRoutes.ts";
import { compareFragmentWithBeacon, normalizeMcpFragment } from "../worker/governance/mcp/compare.ts";
import { getBeaconV2Draft } from "../msh-ops/beacon/beaconV2Schema.ts";
import { computeCodexManifestHash } from "../worker/codex/manifestHash.ts";
import { verifySignedBeaconRelease } from "../msh-ops/beacon/signedBeaconRelease.ts";
import { resetMemoryReceiptAuthority } from "../worker/governance/receiptAuthorityMemory.ts";
import {
  GOVERNANCE_RECEIPT_DOMAIN,
  GOVERNANCE_RECEIPT_KEY_ID,
} from "../worker/governance/signingKeys.ts";
import release from "../msh-ops/beacon/releases/development/current.json" with { type: "json" };

function mockKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
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
  } as unknown as KVNamespace;
}

const signingKey = "test-signing-key";
const governanceSigning = {
  key: signingKey,
  keyId: GOVERNANCE_RECEIPT_KEY_ID,
  domain: GOVERNANCE_RECEIPT_DOMAIN,
  source: "governance" as const,
};

const baseEnv = {
  TTX_STATE: mockKv(),
  AUTH_SIGNING_KEY: signingKey,
  GOVERNANCE_RECEIPT_SIGNING_KEY: signingKey,
  BEACON_SIGNING_KEY: signingKey,
  DEPLOY_ENV: "development",
};

describe("signed beacon v2", () => {
  it("verifies bundled release with test signing key", async () => {
    const result = await verifySignedBeaconRelease(release, signingKey);
    assert.equal(result.valid, true);
  });

  it("rejects modified release signature", async () => {
    const tampered = structuredClone(release);
    tampered.beaconHash = "0".repeat(64);
    const result = await verifySignedBeaconRelease(tampered, signingKey);
    assert.equal(result.valid, false);
  });

  it("exposes GET /api/beacon/v2 when verified", async () => {
    const response = await handleBeaconRoute(
      new Request("https://example.com/api/beacon/v2"),
      "/api/beacon/v2",
      "GET",
      baseEnv,
    );
    assert.ok(response);
    assert.equal(response?.status, 200);
    const body = (await response?.json()) as { verified?: boolean };
    assert.equal(body.verified, true);
  });
});

describe("legacy operator approval bypass", () => {
  it("blocks boolean approval in staging", async () => {
    const result = await evaluateLegacyOperatorApproval(
      { ...baseEnv, DEPLOY_ENV: "staging" },
      { operatorApproval: true },
      { actionClass: "C3", systemTarget: "activation", actorId: "operator", correlationId: "c1" },
    );
    assert.equal(result.allowed, false);
    assert.equal(result.code, "LEGACY_BYPASS_FORBIDDEN");
  });
});

describe("approval receipt enforcement", () => {
  let beaconHash = "";
  let codexHash = "";

  before(async () => {
    await ensureBeaconLoaded();
    const beaconState = await resolveBeaconRuntimeState(baseEnv);
    beaconHash = beaconState.hash ?? "";
    codexHash = await computeCodexManifestHash();
  });

  beforeEach(() => {
    resetMemoryReceiptAuthority();
  });

  async function seedApprovedProposal() {
    const proposal = await saveProposal(baseEnv, {
      proposal_id: crypto.randomUUID(),
      revision: 1,
      created_by: "operator",
      created_at: new Date().toISOString(),
      target_system: "activation",
      action_class: "C3",
      summary: "Create campaign",
      intended_outcome: "Validate governed execution",
      northstar_impact: {
        stability: "primary",
        revenue_validation: "neutral",
        trust: "neutral",
        controlled_growth: "neutral",
        wildcard_innovation: "neutral",
      },
      evidence_refs: [],
      risk_score: { numeric: 40, qualitative: "medium" },
      rollback_plan: "Delete campaign",
      affected_data: [],
      affected_users: "internal",
      required_approver: "operator",
      beacon_hash: beaconHash,
      codex_hash: codexHash,
      expiration: new Date(Date.now() + 60_000).toISOString(),
      status: "approved",
      action_payload: {
        actionType: "activation.campaign.create",
        mutationPayload: { name: "Test Campaign" },
      },
    });

    const unsigned = {
      approvalId: crypto.randomUUID(),
      proposalId: proposal.proposal_id,
      proposalRevision: 1,
      actionClass: "C3" as const,
      actionDigest: await import("../worker/governance/proposalActionDigest.ts").then((m) =>
        m.computeProposalActionDigest(proposal, "development"),
      ),
      beaconHash,
      codexHash,
      targetEnvironment: "development" as const,
      approvedBy: "operator",
      approvedAt: new Date().toISOString(),
      expiresAt: proposal.expiration,
      nonce: crypto.randomUUID(),
    };
    const signature = await signApprovalReceipt(unsigned, governanceSigning);
    const receipt = { ...unsigned, signature };
    await saveApprovalReceipt(baseEnv, receipt);
    return { proposal, receipt };
  }

  it("denies missing receipt", async () => {
    const result = await verifyApprovalForExecution(baseEnv, {
      proposalId: "missing",
      approvalId: "missing",
      actionDigestInput: {
        actionType: "activation.campaign.create",
        actionClass: "C3",
        targetEnvironment: "development",
        targetResource: "activation",
        mutationPayload: { name: "Test Campaign" },
        rollbackReference: "rollback",
        proposalRevision: 1,
        proposalId: "missing",
      },
      environment: "development",
      signing: governanceSigning,
    });
    assert.equal(result.valid, false);
  });

  it("accepts valid receipt and governed execution succeeds", async () => {
    const { proposal, receipt } = await seedApprovedProposal();
    const governed = await runGovernedMutation(baseEnv, {
      actionType: "activation.campaign.create",
      actionClass: "C3",
      environment: "development",
      proposalId: proposal.proposal_id,
      approvalId: receipt.approvalId,
      idempotencyKey: crypto.randomUUID(),
      input: { name: "Test Campaign" },
      rollbackReference: proposal.rollback_plan,
      execute: async () => ({ ok: true, campaignId: "camp-1" }),
    });
    assert.equal(governed.ok, true);
    assert.ok(governed.executionReceipt);
    const updated = await getProposal(baseEnv, proposal.proposal_id);
    assert.equal(updated?.status, "executed");
  });

  it("denies already consumed receipt", async () => {
    const { proposal, receipt } = await seedApprovedProposal();
    const idem = crypto.randomUUID();
    const first = await runGovernedMutation(baseEnv, {
      actionType: "activation.campaign.create",
      actionClass: "C3",
      environment: "development",
      proposalId: proposal.proposal_id,
      approvalId: receipt.approvalId,
      idempotencyKey: idem,
      input: { name: "Test Campaign" },
      rollbackReference: proposal.rollback_plan,
      execute: async () => ({ ok: true }),
    });
    assert.equal(first.ok, true);

    const second = await runGovernedMutation(baseEnv, {
      actionType: "activation.campaign.create",
      actionClass: "C3",
      environment: "development",
      proposalId: proposal.proposal_id,
      approvalId: receipt.approvalId,
      idempotencyKey: crypto.randomUUID(),
      input: { name: "Test Campaign" },
      rollbackReference: proposal.rollback_plan,
      execute: async () => ({ ok: true }),
    });
    assert.equal(second.ok, false);
    assert.equal(second.code, "RECEIPT_CONSUMED");
  });
});

describe("mcp governance delta", () => {
  it("quarantines northstar conflict", () => {
    const fragment = normalizeMcpFragment({
      source_id: "mcp-test",
      source_type: "advisory",
      fetched_at: new Date().toISOString(),
      verified: true,
      rules: [
        {
          id: "rule-1",
          axis: "STABILITY",
          statement: "Upstream override",
          strength: "high",
          northstar_rank: 0,
        },
      ],
    });
    assert.ok(fragment);
    const report = compareFragmentWithBeacon(fragment, getBeaconV2Draft());
    assert.equal(report.quarantined, true);
  });
});

import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import { ensureBeaconLoaded } from "../msh-ops/beacon/loadBeacon.ts";
import { getActiveBeaconHash } from "../worker/governance/beaconContext.ts";
import { handleGovernanceProposalRoute } from "../worker/governanceRoutes.ts";
import { computeCodexManifestHash } from "../worker/codex/manifestHash.ts";

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

describe("governance proposals", () => {
  const env = {
    TTX_STATE: mockKv(),
    AUTH_SIGNING_KEY: "test-signing-key",
    BEACON_SIGNING_KEY: "test-signing-key",
    GOVERNANCE_RECEIPT_SIGNING_KEY: "test-signing-key",
    DEPLOY_ENV: "development",
  };

  let activeBeaconHash = "";

  before(async () => {
    await ensureBeaconLoaded();
    activeBeaconHash = (await getActiveBeaconHash(env)).hash;
  });

  it("creates and lists a pending proposal", async () => {
    const createResponse = await handleGovernanceProposalRoute(
      new Request("https://example.com/api/governance/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_system: "activation",
          action_class: "C3",
          summary: "Approve test campaign activation",
          intended_outcome: "Validate proposal lifecycle",
          rollback_plan: "Revert campaign status to READY_FOR_APPROVAL",
          beacon_hash: activeBeaconHash,
        }),
      }),
      "/api/governance/proposals",
      "POST",
      env,
    );
    assert.ok(createResponse);
    assert.equal(createResponse?.status, 201);
    const created = (await createResponse?.json()) as { proposal?: { proposal_id?: string; status?: string } };
    assert.equal(created.proposal?.status, "pending");

    const listResponse = await handleGovernanceProposalRoute(
      new Request("https://example.com/api/governance/proposals?status=pending"),
      "/api/governance/proposals",
      "GET",
      env,
    );
    assert.ok(listResponse);
    const listed = (await listResponse?.json()) as { proposals?: { proposal_id: string }[] };
    assert.ok(listed.proposals?.some((p) => p.proposal_id === created.proposal?.proposal_id));
  });

  it("blocks execution without approval receipt in activation path helper", async () => {
    const { verifyApprovalReceiptForRequest } = await import("../worker/governance/proposalStore.ts");
    const result = await verifyApprovalReceiptForRequest(env, {
      proposalId: "missing",
      approvalId: "missing",
    });
    assert.equal(result.valid, false);
  });
});

describe("policy gate", () => {
  const gateEnv = {
    AUTH_SIGNING_KEY: "test-signing-key",
    BEACON_SIGNING_KEY: "test-signing-key",
    DEPLOY_ENV: "development",
  };

  it("rejects beacon hash mismatch", async () => {
    const { validateProposalEligibility } = await import("../worker/governance/policyGate.ts");
    const codexHash = await computeCodexManifestHash();
    const result = await validateProposalEligibility(
      {
        action_class: "C3",
        beacon_hash: "0".repeat(64),
        codex_hash: codexHash,
        summary: "test",
        rollback_plan: "rollback",
        expiration: new Date(Date.now() + 60_000).toISOString(),
      },
      gateEnv,
    );
    assert.equal(result.allowed, false);
    assert.equal(result.code, "BEACON_HASH_MISMATCH");
  });

  it("rejects safe mode only when beacon hash matches reference", async () => {
    const { validateProposalEligibility } = await import("../worker/governance/policyGate.ts");
    const { resolveBeaconRuntimeState } = await import("../worker/governance/beaconRuntime.ts");
    const legacyEnv = { DEPLOY_ENV: "development" };
    const codexHash = await computeCodexManifestHash();
    const beaconState = await resolveBeaconRuntimeState(legacyEnv);
    assert.equal(beaconState.status, "legacy_v1");
    assert.ok(beaconState.hash);
    const result = await validateProposalEligibility(
      {
        action_class: "C3",
        beacon_hash: beaconState.hash,
        codex_hash: codexHash,
        summary: "test",
        rollback_plan: "rollback",
        expiration: new Date(Date.now() + 60_000).toISOString(),
      },
      legacyEnv,
    );
    assert.equal(result.allowed, false);
    assert.equal(result.code, "SIGNED_BEACON_NOT_ACTIVE");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ensureBeaconLoaded } from "../msh-ops/beacon/loadBeacon.ts";
import { computeCodexManifestHash } from "../worker/codex/manifestHash.ts";
import { resolveBeaconRuntimeState } from "../worker/governance/beaconRuntime.ts";
import {
  GOVERNANCE_DENIAL_GUARANTEES,
  PROPOSAL_POLICY_DENIAL_TABLE,
  resolveGovernanceDenialFromState,
  resolveProposalPolicyDenial,
} from "../worker/governance/governanceDenialPrecedence.ts";
import { validateProposalEligibility } from "../worker/governance/policyGate.ts";

const gateEnv = {
  AUTH_SIGNING_KEY: "test-signing-key",
  BEACON_SIGNING_KEY: "test-signing-key",
  DEPLOY_ENV: "development",
};

function baseProposal(beaconHash: string, codexHash: string) {
  return {
    action_class: "C3" as const,
    beacon_hash: beaconHash,
    codex_hash: codexHash,
    summary: "summary",
    rollback_plan: "rollback",
    expiration: new Date(Date.now() + 60_000).toISOString(),
  };
}

describe("governance denial precedence", () => {
  it("documents deterministic precedence table", () => {
    assert.ok(PROPOSAL_POLICY_DENIAL_TABLE.length >= 8);
    const codes = PROPOSAL_POLICY_DENIAL_TABLE.map((row) => row.code);
    assert.ok(codes.includes("BEACON_HASH_MISMATCH"));
    assert.ok(codes.indexOf("BEACON_HASH_MISMATCH") < codes.indexOf("SIGNED_BEACON_NOT_ACTIVE"));
  });

  it("guarantees no mutation on every denial path", () => {
    const denial = resolveGovernanceDenialFromState({
      authenticated: false,
      requestValid: true,
      receiptPresent: true,
      receiptValid: true,
      receiptExpired: false,
      receiptBindingValid: true,
      beaconAvailable: true,
      beaconSignatureValid: true,
      beaconHashValid: true,
      beaconSafeMode: false,
      policyAllowed: true,
    });
    assert.ok(denial);
    assert.deepEqual(
      {
        mutationOccurred: denial.mutationOccurred,
        deploymentTriggered: denial.deploymentTriggered,
        receiptConsumed: denial.receiptConsumed,
      },
      GOVERNANCE_DENIAL_GUARANTEES,
    );
  });

  it("prefers BEACON_HASH_MISMATCH over safe mode when hash is wrong", async () => {
    await ensureBeaconLoaded();
    const beaconState = await resolveBeaconRuntimeState({ DEPLOY_ENV: "development" });
    const codexHash = await computeCodexManifestHash();
    const denial = resolveProposalPolicyDenial(
      beaconState,
      baseProposal("0".repeat(64), codexHash),
      codexHash,
    );
    assert.ok(denial);
    assert.equal(denial.code, "BEACON_HASH_MISMATCH");
    assert.equal(denial.httpStatus, 403);
  });

  it("returns SIGNED_BEACON_NOT_ACTIVE when hash matches legacy reference", async () => {
    const beaconState = await resolveBeaconRuntimeState({ DEPLOY_ENV: "development" });
    assert.equal(beaconState.status, "legacy_v1");
    const codexHash = await computeCodexManifestHash();
    const denial = resolveProposalPolicyDenial(
      beaconState,
      baseProposal(beaconState.hash ?? "", codexHash),
      codexHash,
    );
    assert.ok(denial);
    assert.equal(denial.code, "SIGNED_BEACON_NOT_ACTIVE");
  });

  it("allows verified v2 proposals with matching hashes", async () => {
    const beaconState = await resolveBeaconRuntimeState(gateEnv);
    assert.equal(beaconState.status, "verified_v2");
    const codexHash = await computeCodexManifestHash();
    const denial = resolveProposalPolicyDenial(
      beaconState,
      baseProposal(beaconState.hash ?? "", codexHash),
      codexHash,
    );
    assert.equal(denial, null);
    const gate = await validateProposalEligibility(
      baseProposal(beaconState.hash ?? "", codexHash),
      gateEnv,
    );
    assert.equal(gate.allowed, true);
  });

  it("rejects codex hash mismatch before safe mode when beacon hash matches", async () => {
    const beaconState = await resolveBeaconRuntimeState(gateEnv);
    const denial = resolveProposalPolicyDenial(
      beaconState,
      baseProposal(beaconState.hash ?? "", "0".repeat(64)),
      await computeCodexManifestHash(),
    );
    assert.ok(denial);
    assert.equal(denial.code, "CODEX_HASH_MISMATCH");
  });

  it("maps unauthenticated state to 401", () => {
    const denial = resolveGovernanceDenialFromState({
      authenticated: false,
      requestValid: true,
      receiptPresent: true,
      receiptValid: true,
      receiptExpired: false,
      receiptBindingValid: true,
      beaconAvailable: true,
      beaconSignatureValid: true,
      beaconHashValid: true,
      beaconSafeMode: false,
      policyAllowed: true,
    });
    assert.equal(denial?.httpStatus, 401);
    assert.equal(denial?.code, "UNAUTHENTICATED");
  });
});

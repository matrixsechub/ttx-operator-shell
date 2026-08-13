import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ensureBeaconLoaded } from "../../msh-ops/beacon/loadBeacon.ts";
import type { ActionProposal } from "../../worker/flywheel/mainCompat.ts";
import {
  computeProposalActionDigest,
  runGovernedMutation,
} from "../../worker/flywheel/mainCompat.ts";

describe("Flywheel governed mutation digest continuity", () => {
  it("stamps the approval actionDigest onto the execution receipt", async () => {
    await ensureBeaconLoaded();
    const proposal = {
      proposal_id: "prop-1",
      revision: 1,
      action_class: "C2",
      action_payload: { commandId: "cmd-1", stage: "lead_generation" },
      target_system: "flywheel",
      rollback_plan: "flywheel:rollback",
      beacon_hash: "b".repeat(64),
      codex_hash: "c".repeat(64),
      expiration: new Date(Date.now() + 60_000).toISOString(),
      status: "approved",
    } as unknown as ActionProposal;

    const actionDigest = await computeProposalActionDigest(proposal, "development", {
      actionType: "flywheel.command",
      mutationPayload: proposal.action_payload ?? {},
    });

    const inputOnlyDigestBytes = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(JSON.stringify(proposal.action_payload ?? {})),
    );
    const inputOnlyDigest = [...new Uint8Array(inputOnlyDigestBytes)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    assert.notEqual(actionDigest, inputOnlyDigest);

    const governed = await runGovernedMutation({ AUTH_SIGNING_KEY: "test-signing-key" }, {
      actionType: "flywheel.command",
      actionClass: "C2",
      environment: "development",
      proposalId: proposal.proposal_id,
      approvalId: "approval-1",
      actionDigest,
      idempotencyKey: "idem-digest-1",
      input: proposal.action_payload ?? {},
      rollbackReference: proposal.rollback_plan,
      execute: async () => ({ ok: true }),
    });

    assert.equal(governed.ok, true);
    assert.equal(governed.executionReceipt?.actionDigest, actionDigest);
    assert.notEqual(governed.executionReceipt?.actionDigest, inputOnlyDigest);
  });
});

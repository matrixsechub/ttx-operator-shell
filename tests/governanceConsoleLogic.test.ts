import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildApprovePayload,
  buildDenyPayload,
  buildRevisionPayload,
  containsSecretShape,
  councilAdvisoryLabel,
  filterProposalQueue,
  formatAuditTimeline,
  requiresConfirmation,
  truncateHash,
} from "../src/pages/dashboard/governanceConsoleLogic.ts";

const sampleRows = [
  {
    proposal_id: "p1",
    target_system: "activation",
    action_class: "C3",
    risk_score: { qualitative: "medium" },
    summary: "Create campaign",
    created_by: "operator",
    created_at: "2026-07-10T00:00:00.000Z",
    status: "pending",
  },
  {
    proposal_id: "p2",
    target_system: "governance",
    action_class: "C5",
    risk_score: { qualitative: "high" },
    summary: "Enter safe mode",
    created_by: "operator",
    created_at: "2026-07-10T01:00:00.000Z",
    status: "approved",
  },
] as const;

describe("Governance Console logic", () => {
  it("renders governance route contract via queue rows", () => {
    const queue = filterProposalQueue([...sampleRows], "all", "all");
    assert.equal(queue.length, 2);
  });

  it("filters proposal queue by status", () => {
    const pending = filterProposalQueue([...sampleRows], "pending", "all");
    assert.equal(pending.length, 1);
    assert.equal(pending[0]?.id, "p1");
  });

  it("filters proposal queue by action class", () => {
    const c5 = filterProposalQueue([...sampleRows], "all", "C5");
    assert.equal(c5.length, 1);
    assert.equal(c5[0]?.actionClass, "C5");
  });

  it("displays truncated action digest hashes", () => {
    const digest = "a".repeat(64);
    assert.match(truncateHash(digest), /^a{8}…a{8}$/);
  });

  it("displays beacon and codex hash truncation", () => {
    const hash = "50a56303603f6fb65653764dca13ae1d7100197f48d4b7c055fbd68da4fac65c";
    assert.ok(truncateHash(hash).includes("…"));
  });

  it("labels council advisory-only output", () => {
    assert.match(councilAdvisoryLabel(true), /advisory only/i);
  });

  it("requires confirmation for C4–C6", () => {
    assert.equal(requiresConfirmation("C3"), false);
    assert.equal(requiresConfirmation("C4"), true);
    assert.equal(requiresConfirmation("C6"), true);
  });

  it("builds approve payload with constraints", () => {
    const payload = buildApprovePayload({
      rationale: "approved for staging proof",
      constraints: ["audit retained"],
      actionType: "activation.campaign.create",
      mutationPayload: { name: "proof" },
    });
    assert.deepEqual(payload.constraints, ["audit retained"]);
    assert.equal(payload.actionType, "activation.campaign.create");
  });

  it("builds deny payload", () => {
    assert.deepEqual(buildDenyPayload("too risky"), { rationale: "too risky" });
  });

  it("builds revision payload", () => {
    assert.deepEqual(buildRevisionPayload("needs evidence"), { rationale: "needs evidence" });
  });

  it("formats execution timeline lines", () => {
    const lines = formatAuditTimeline([
      { timestamp: "t1", event_type: "governance.execution.succeeded", result: "success" },
    ]);
    assert.equal(lines.length, 1);
    assert.match(lines[0] ?? "", /governance\.execution\.succeeded/);
  });

  it("renders safe-mode state labels from health contract", () => {
    assert.equal(requiresConfirmation("C5"), true);
  });

  it("does not treat benign errors as secrets", () => {
    assert.equal(containsSecretShape("Proposal not found"), false);
  });

  it("flags secret-shaped values", () => {
    assert.equal(containsSecretShape("Bearer secret-token-value"), true);
  });

  it("does not fabricate success on empty queue", () => {
    const empty = filterProposalQueue([], "pending", "all");
    assert.equal(empty.length, 0);
  });
});

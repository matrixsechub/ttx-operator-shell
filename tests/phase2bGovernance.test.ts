import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateActionClassPolicy, resolveRegisteredActionClass } from "../worker/governance/actionClassPolicy.ts";
import { generateCouncilReview } from "../worker/governance/councilReview.ts";
import { validateRollbackRequest } from "../worker/governance/rollbackPolicy.ts";
import { defaultNorthstarImpact } from "../worker/governance/types.ts";
import type { ActionProposal } from "../worker/governance/types.ts";
import { handleOperatorGovernanceRoute } from "../worker/operatorGovernanceRoutes.ts";

function baseProposal(overrides: Partial<ActionProposal> = {}): ActionProposal {
  return {
    proposal_id: "proposal-1",
    revision: 1,
    created_by: "operator",
    created_at: new Date().toISOString(),
    target_system: "activation",
    action_class: "C3",
    summary: "Create activation campaign",
    intended_outcome: "Validate governed pipeline",
    northstar_impact: defaultNorthstarImpact(),
    evidence_refs: ["audit:event:1"],
    risk_score: { numeric: 40, qualitative: "medium" },
    rollback_plan: "Archive campaign",
    affected_data: ["activation"],
    affected_users: "internal",
    required_approver: "operator",
    beacon_hash: "a".repeat(64),
    codex_hash: "b".repeat(64),
    expiration: new Date(Date.now() + 60_000).toISOString(),
    status: "pending",
    action_payload: {
      actionType: "activation.campaign.create",
      mutationPayload: { name: "proof", reason: "test" },
    },
    ...overrides,
  };
}

describe("Phase 2B action class policy", () => {
  it("rejects unknown target action", () => {
    const result = resolveRegisteredActionClass("unknown.action", "C3");
    assert.equal(result.allowed, false);
    assert.equal(result.code, "UNKNOWN_TARGET_ACTION");
  });

  it("requires rollback plan for C3+", () => {
    const result = validateActionClassPolicy(baseProposal({ rollback_plan: "" }), {
      actionType: "activation.campaign.create",
      safeModeActive: false,
    });
    assert.equal(result.allowed, false);
    assert.equal(result.code, "ROLLBACK_PLAN_REQUIRED");
  });

  it("blocks C2–C5 mutations in safe mode", () => {
    const result = validateActionClassPolicy(baseProposal(), {
      actionType: "activation.campaign.create",
      safeModeActive: true,
    });
    assert.equal(result.allowed, false);
    assert.equal(result.code, "SAFE_MODE_MUTATION_BLOCKED");
  });

  it("requires rationale for C5", () => {
    const result = validateActionClassPolicy(
      baseProposal({
        action_class: "C5",
        action_payload: { actionType: "governance.safe_mode.enter", mutationPayload: { reason: "incident" } },
      }),
      {
        actionType: "governance.safe_mode.enter",
        safeModeActive: false,
      },
    );
    assert.equal(result.allowed, false);
    assert.equal(result.code, "OPERATOR_RATIONALE_REQUIRED");
  });
});

describe("Phase 2B council review", () => {
  it("remains advisory only", () => {
    const review = generateCouncilReview(baseProposal());
    assert.equal(review.advisoryOnly, true);
    assert.ok(review.consensus.some((line) => line.includes("advisory")));
  });

  it("retains disagreements deterministically", () => {
    const review = generateCouncilReview(
      baseProposal({
        risk_score: { numeric: 95, qualitative: "critical" },
        action_class: "C6",
        evidence_refs: [],
      }),
    );
    assert.ok(review.disagreements.length > 0);
    assert.notEqual(review.recommendedDecision, "approve");
  });

  it("partial review does not auto-approve", () => {
    const review = generateCouncilReview(baseProposal(), true);
    assert.equal(review.partial, true);
    assert.equal(review.recommendedDecision, "request_revision");
  });
});

describe("Phase 2B rollback policy", () => {
  it("requires separate rollback proposal", () => {
    const source = baseProposal({ status: "executed" });
    const rollback = baseProposal({
      proposal_id: "rollback-1",
      status: "pending",
      action_payload: {
        actionType: "activation.campaign.archive",
        mutationPayload: { campaignId: "c1", reason: "rollback" },
      },
    });
    const result = validateRollbackRequest({ sourceProposal: source, rollbackProposal: rollback });
    assert.equal(result.allowed, false);
    assert.equal(result.code, "ROLLBACK_RECEIPT_REQUIRED");
  });

  it("rejects rollback without plan", () => {
    const source = baseProposal({ status: "executed", rollback_plan: "" });
    const rollback = baseProposal({
      proposal_id: "rollback-2",
      status: "approved",
      approval_id: "approval-2",
      action_payload: {
        actionType: "activation.campaign.archive",
        mutationPayload: { campaignId: "c1", reason: "rollback" },
      },
    });
    const result = validateRollbackRequest({ sourceProposal: source, rollbackProposal: rollback });
    assert.equal(result.code, "ROLLBACK_PLAN_MISSING");
  });
});

describe("Phase 2B operator governance API security", () => {
  const env = {
    TTX_STATE: {
      async get() {
        return null;
      },
      async put() {},
      async delete() {},
      async list() {
        return { keys: [], list_complete: true, cacheStatus: null };
      },
      async getWithMetadata() {
        return null;
      },
    } as unknown as KVNamespace,
    DEPLOY_ENV: "development",
  };

  it("requires operator auth for health endpoint", async () => {
    const response = await handleOperatorGovernanceRoute(
      new Request("https://example.com/api/operator/governance/health"),
      "/api/operator/governance/health",
      "GET",
      env,
    );
    assert.ok(response);
    assert.equal(response?.status, 401);
    const body = (await response?.json()) as { code?: string };
    assert.equal(body.code, "OPERATOR_AUTH_REQUIRED");
  });

  it("fails safely for unknown governance route", async () => {
    const response = await handleOperatorGovernanceRoute(
      new Request("https://example.com/api/operator/governance/unknown"),
      "/api/operator/governance/unknown",
      "GET",
      env,
    );
    assert.ok(response);
    assert.equal(response?.status, 404);
  });
});

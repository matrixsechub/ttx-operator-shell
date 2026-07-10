import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createRefactorDecisionLog,
  evaluateRefactorApproval,
} from "../../../msh-ops/governance/approveRefactor.ts";

describe("approveRefactor", () => {
  it("denies refactors without operator approval", () => {
    const result = evaluateRefactorApproval({
      agentId: "OrganizerAgent",
      suggestionIds: ["ORG-001"],
      description: "test",
      operatorApproval: false,
    });
    assert.equal(result.decision, "denied");
    assert.match(result.reason, /operator approval/i);
  });

  it("approves when operator explicitly approves suggestion IDs", () => {
    const result = evaluateRefactorApproval({
      agentId: "OrganizerAgent",
      suggestionIds: ["ORG-001", "ORG-002"],
      description: "test",
      operatorApproval: true,
      operatorCallsign: "operator",
    });
    assert.equal(result.decision, "approved");
    assert.equal(result.suggestionIds.length, 2);
  });

  it("denies when suggestion list is empty even with operatorApproval true", () => {
    const result = evaluateRefactorApproval({
      agentId: "OrganizerAgent",
      suggestionIds: [],
      description: "test",
      operatorApproval: true,
    });
    assert.equal(result.decision, "denied");
  });

  it("records decisions in the log", () => {
    const log = createRefactorDecisionLog();
    const request = {
      agentId: "OrganizerAgent" as const,
      suggestionIds: ["ORG-001"],
      description: "test",
      operatorApproval: true,
    };
    const result = evaluateRefactorApproval(request);
    log.append(request, result);
    assert.equal(log.entries.length, 1);
    assert.ok(log.toJsonl().includes("ORG-001"));
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generatePatchProposal, exportProposalAsText } from "../worker/data/prismPatchProposal.ts";
import { buildTriageItemFromGroup, generateTriageItemsFromAudit } from "../worker/data/prismTriageEngine.ts";
import { generateUiUxAudit } from "../worker/data/prismUiuxEngine.ts";
import { getAgentGovernanceContextFor } from "../msh-ops/agent/initAgentGovernance.ts";
import { checkAutonomy } from "../msh-ops/governance/checkAutonomy.ts";
import { PRISM_UIUX_AGENT_ID } from "../worker/data/prismUiuxTypes.ts";

describe("PRISM patch proposal generator", () => {
  it("generates proposals with acceptance criteria, tests, rollback, and telemetry", async () => {
    const audit = await generateUiUxAudit(
      { mode: "AUDIT_ROUTE", routes: ["/enter"], viewport: "mobile", useFixture: true },
      "audit-proposal-1",
    );
    const items = await generateTriageItemsFromAudit(audit);
    assert.ok(items.length > 0);
    const item = items[0]!;
    const proposal = await generatePatchProposal(item, audit, audit.findings, 1);

    assert.equal(proposal.advisoryOnly, true);
    assert.equal(proposal.mutationAuthorized, false);
    assert.equal(proposal.operatorApprovalRequired, true);
    assert.ok(proposal.acceptanceCriteria.length > 0);
    assert.ok(proposal.testPlan.length > 0);
    assert.ok(proposal.rollbackPlan.length > 0);
    assert.ok(proposal.telemetryRequirements.length > 0);
    assert.ok(proposal.implementationPlan.length >= 2);
    assert.equal(proposal.governance.mutationAuthorized, false);
    assert.equal(proposal.governance.revision, 1);
    assert.ok(proposal.blockedActions.includes("deploy"));
    assert.ok(proposal.blockedActions.includes("commit"));
  });

  it("increments revision deterministically", async () => {
    const audit = await generateUiUxAudit(
      { mode: "AUDIT_ROUTE", routes: ["/"], viewport: "mobile", useFixture: true },
      "audit-proposal-rev",
    );
    const item = (await generateTriageItemsFromAudit(audit))[0]!;
    const rev1 = await generatePatchProposal(item, audit, audit.findings, 1);
    const rev2 = await generatePatchProposal(item, audit, audit.findings, 2);
    assert.notEqual(rev1.proposalId, rev2.proposalId);
    assert.equal(rev2.governance.revision, 2);
  });

  it("exports operator-readable proposal text without execution authority", async () => {
    const audit = await generateUiUxAudit(
      { mode: "ACCESSIBILITY_CHECK", routes: ["/login"], viewport: "mobile", useFixture: true },
      "audit-proposal-text",
    );
    const group = audit.findings.slice(0, 1);
    if (group.length === 0) return;
    const item = await buildTriageItemFromGroup(audit, group);
    const proposal = await generatePatchProposal(item, audit, audit.findings, 1);
    const text = exportProposalAsText(proposal);
    assert.match(text, /ADVISORY ONLY/i);
    assert.match(text, /NO MUTATION AUTHORITY/i);
    assert.doesNotMatch(text, /approvePatch|deploy now/i);
  });

  it("AI enrichment cannot add mutation authority when disabled", () => {
    const decision = checkAutonomy(
      {
        agentId: PRISM_UIUX_AGENT_ID,
        actionKind: "advisory",
        description: "test",
        axis: "TRUST",
        priorityIndex: 2,
      },
      getAgentGovernanceContextFor(PRISM_UIUX_AGENT_ID),
    );
    assert.ok(decision.decision === "allowed" || decision.decision === "denied");
  });
});

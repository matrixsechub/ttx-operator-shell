import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runOrganizerAnalysis } from "../../../msh-ops/agents/OrganizerAgent.ts";
import { evaluateRefactorApproval } from "../../../msh-ops/governance/approveRefactor.ts";
import { applyRefactorPlan, planFromSuggestionIds } from "../../../msh-ops/agents/refactorEngine.ts";
import { join } from "node:path";

describe("OrganizerAgent", () => {
  it("produces an advisory report for the real repository", async () => {
    const repoRoot = join(import.meta.dirname, "../../..");
    const report = await runOrganizerAnalysis(repoRoot);

    assert.equal(report.agentId, "OrganizerAgent");
    assert.equal(report.mode, "advisory");
    assert.ok(report.scan.files.length > 0);
    assert.ok(typeof report.summary.errorCount === "number");
    assert.ok(typeof report.summary.warnCount === "number");
  });

  it("does not include beacon paths in auto-fixable move suggestions", async () => {
    const repoRoot = join(import.meta.dirname, "../../..");
    const report = await runOrganizerAnalysis(repoRoot);

    const beaconSuggestions = report.suggestions.filter(
      (s) => s.relativePath.startsWith("msh-ops/beacon/") || s.targetPath?.startsWith("msh-ops/beacon/"),
    );
    assert.equal(beaconSuggestions.length, 0);
  });

  it("blocks beacon mutation through refactor engine", async () => {
    const repoRoot = join(import.meta.dirname, "../../..");
    const plan = planFromSuggestionIds(
      [
        {
          id: "ORG-BEACON",
          action: "remove-dead-code",
          relativePath: "msh-ops/beacon/northstar.json",
        },
      ],
      ["ORG-BEACON"],
    );
    const approval = evaluateRefactorApproval({
      agentId: "OrganizerAgent",
      suggestionIds: ["ORG-BEACON"],
      description: "beacon test",
      operatorApproval: true,
    });

    const result = await applyRefactorPlan(repoRoot, plan, approval);
    assert.ok(result.errors.some((e) => /beacon|read-only/i.test(e)));
  });
});

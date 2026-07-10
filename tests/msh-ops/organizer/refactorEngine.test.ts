import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, it, afterEach } from "node:test";
import { evaluateRefactorApproval } from "../../../msh-ops/governance/approveRefactor.ts";
import { applyRefactorPlan, planFromSuggestionIds } from "../../../msh-ops/agents/refactorEngine.ts";

describe("refactorEngine", () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it("rejects apply without approval", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "organizer-refactor-deny-"));
    const plan = {
      actions: [
        {
          suggestionId: "ORG-001",
          action: "remove-dead-code" as const,
          relativePath: "src/orphan.ts",
        },
      ],
      description: "test",
    };
    const denied = evaluateRefactorApproval({
      agentId: "OrganizerAgent",
      suggestionIds: [],
      description: "test",
      operatorApproval: false,
    });

    await assert.rejects(() => applyRefactorPlan(tempDir!, plan, denied), /denied/i);
  });

  it("moves files and updates imports", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "organizer-refactor-move-"));
    cpSync(join(import.meta.dirname, "fixtures/refactor-src"), tempDir, { recursive: true });

    const suggestions = [
      {
        id: "ORG-001",
        action: "move-file" as const,
        relativePath: "src/util.ts",
        targetPath: "src/lib/util.ts",
      },
    ];
    const plan = planFromSuggestionIds(suggestions, ["ORG-001"]);
    const approval = evaluateRefactorApproval({
      agentId: "OrganizerAgent",
      suggestionIds: ["ORG-001"],
      description: "move util",
      operatorApproval: true,
    });

    const result = await applyRefactorPlan(tempDir, plan, approval);
    assert.equal(result.errors.length, 0);
    assert.equal(existsSync(join(tempDir, "src/lib/util.ts")), true);
    assert.equal(existsSync(join(tempDir, "src/util.ts")), false);

    const consumer = readFileSync(join(tempDir, "src/consumer.ts"), "utf8");
    assert.match(consumer, /\.\/lib\/util\.ts/);
    assert.ok(result.applied.length > 0);
  });

  it("removes dead code when approved", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "organizer-refactor-remove-"));
    cpSync(join(import.meta.dirname, "fixtures/dead"), join(tempDir, "src"), { recursive: true });

    const plan = {
      actions: [
        {
          suggestionId: "ORG-002",
          action: "remove-dead-code" as const,
          relativePath: "src/orphan.ts",
        },
      ],
      description: "remove orphan",
    };
    const approval = evaluateRefactorApproval({
      agentId: "OrganizerAgent",
      suggestionIds: ["ORG-002"],
      description: "remove",
      operatorApproval: true,
    });

    const result = await applyRefactorPlan(tempDir, plan, approval);
    assert.equal(result.errors.length, 0);
    assert.equal(existsSync(join(tempDir, "src/orphan.ts")), false);
  });

  it("blocks beacon mutations even with approval", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "organizer-refactor-beacon-"));
    const plan = {
      actions: [
        {
          suggestionId: "ORG-999",
          action: "move-file" as const,
          relativePath: "msh-ops/beacon/northstar.json",
          targetPath: "msh-ops/beacon/northstar-backup.json",
        },
      ],
      description: "beacon move",
    };
    const approval = evaluateRefactorApproval({
      agentId: "OrganizerAgent",
      suggestionIds: ["ORG-999"],
      description: "beacon",
      operatorApproval: true,
    });

    const result = await applyRefactorPlan(tempDir, plan, approval);
    assert.ok(result.errors.some((e) => /beacon/i.test(e)));
  });

  it("refuses create-barrel in forbidden directories", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "organizer-refactor-barrel-"));
    const plan = {
      actions: [
        {
          suggestionId: "ORG-003",
          action: "create-barrel" as const,
          relativePath: "src/components/index.ts",
        },
      ],
      description: "barrel",
    };
    const approval = evaluateRefactorApproval({
      agentId: "OrganizerAgent",
      suggestionIds: ["ORG-003"],
      description: "barrel",
      operatorApproval: true,
    });

    const result = await applyRefactorPlan(tempDir, plan, approval);
    assert.ok(result.errors.some((e) => /barrel/i.test(e)));
  });
});

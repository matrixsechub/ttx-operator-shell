import assert from "node:assert/strict";
import { cpSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, it, afterEach } from "node:test";
import { scanRepository } from "../../../msh-ops/agents/utils/fileScanner.ts";
import { analyzeStructure } from "../../../msh-ops/agents/utils/structureAnalyzer.ts";

describe("structureAnalyzer", () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it("warns on barrel index.ts in forbidden components directory", () => {
    tempDir = mkdtempSync(join(tmpdir(), "organizer-barrel-"));
    cpSync(join(import.meta.dirname, "fixtures/barrel"), tempDir, { recursive: true });

    const scan = scanRepository(tempDir);
    const analysis = analyzeStructure(tempDir, scan);
    assert.ok(analysis.issues.some((i) => i.ruleId === "barrel-policy"));
  });

  it("reports version drift when package.json and wrangler disagree", () => {
    tempDir = mkdtempSync(join(tmpdir(), "organizer-version-"));
    mkdirSync(join(tempDir, "src"), { recursive: true });
    writeFileSync(join(tempDir, "package.json"), JSON.stringify({ version: "1.0.0" }));
    writeFileSync(
      join(tempDir, "wrangler.jsonc"),
      '{ "vars": { "APP_VERSION": "0.9.0" } }',
    );

    const scan = scanRepository(tempDir);
    const analysis = analyzeStructure(tempDir, scan);
    assert.ok(analysis.issues.some((i) => i.ruleId === "schema-drift-version"));
  });
});

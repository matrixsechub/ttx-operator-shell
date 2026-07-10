import assert from "node:assert/strict";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, it, afterEach } from "node:test";
import {
  analyzeImports,
  buildImportGraph,
  detectCircularImports,
  rewriteImportSpecifier,
} from "../../../msh-ops/agents/utils/importGraph.ts";
import { scanRepository } from "../../../msh-ops/agents/utils/fileScanner.ts";

describe("importGraph", () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it("detects circular imports in fixture", () => {
    tempDir = mkdtempSync(join(tmpdir(), "organizer-cycle-"));
    cpSync(join(import.meta.dirname, "fixtures/cycle"), join(tempDir, "src"), { recursive: true });

    const scan = scanRepository(tempDir);
    const { adjacency } = buildImportGraph(tempDir, scan.files);
    const cycles = detectCircularImports(adjacency);
    assert.ok(cycles.length > 0);
    assert.ok(cycles[0]!.chain.length >= 2);
  });

  it("detects dead exports when file has no importers", () => {
    tempDir = mkdtempSync(join(tmpdir(), "organizer-dead-"));
    cpSync(join(import.meta.dirname, "fixtures/dead"), join(tempDir, "src"), { recursive: true });

    const scan = scanRepository(tempDir);
    const result = analyzeImports(tempDir, scan.files);
    assert.ok(result.deadExports.some((d) => d.relativePath.endsWith("orphan.ts")));
  });

  it("rewrites import specifiers after a move", () => {
    const rewritten = rewriteImportSpecifier(
      "src/consumer.ts",
      "src/util.ts",
      "src/lib/util.ts",
      "./util.ts",
    );
    assert.equal(rewritten, "./lib/util.ts");
  });
});

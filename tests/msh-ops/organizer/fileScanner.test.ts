import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, it, afterEach } from "node:test";
import { scanRepository, isBeaconPath } from "../../../msh-ops/agents/utils/fileScanner.ts";

describe("fileScanner", () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it("scans fixture directories and ignores node_modules", () => {
    tempDir = mkdtempSync(join(tmpdir(), "organizer-scan-"));
    cpSync(join(import.meta.dirname, "fixtures/refactor-src"), tempDir, { recursive: true });

    const scan = scanRepository(tempDir);
    const paths = scan.files.map((f) => f.relativePath);
    assert.ok(paths.some((p) => p.includes("src/util.ts")));
    assert.ok(paths.some((p) => p.includes("src/consumer.ts")));
    assert.equal(scan.files.every((f) => !f.relativePath.includes("node_modules")), true);
  });

  it("detects naming anomalies in misnamed components", () => {
    tempDir = mkdtempSync(join(tmpdir(), "organizer-naming-"));
    const srcDir = join(tempDir, "src", "components");
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, "badname.tsx"), "export default function X() { return null; }");

    const scan = scanRepository(tempDir);
    assert.ok(scan.anomalies.some((a) => a.kind === "naming-component"));
  });

  it("identifies beacon paths as protected", () => {
    assert.equal(isBeaconPath("msh-ops/beacon/northstar.json"), true);
    assert.equal(isBeaconPath("msh-ops/agents/OrganizerAgent.ts"), false);
  });
});

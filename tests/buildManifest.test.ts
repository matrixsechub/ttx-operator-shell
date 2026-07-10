import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("assemble-operator-dist script", () => {
  it("defines required shell renames and build manifest output", () => {
    const script = readFileSync(join(root, "scripts", "assemble-operator-dist.mjs"), "utf8");
    assert.match(script, /ecosystem-shell\.html/);
    assert.match(script, /operator-shell\.html/);
    assert.match(script, /\.build-manifest\.json/);
    assert.match(script, /bundledBuildInfo\.ts/);
  });
});

describe("bundled build info defaults", () => {
  it("exports fallback build metadata for worker dev", () => {
    const bundled = readFileSync(join(root, "worker", "bundledBuildInfo.ts"), "utf8");
    assert.match(bundled, /BUNDLED_BUILD_COMMIT_SHA/);
    assert.match(bundled, /BUNDLED_APP_VERSION/);
  });
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("release manifest generation", () => {
  it("wires generate-release-manifest into the production build", () => {
    const build = readFileSync(join(root, "scripts", "build.mjs"), "utf8");
    assert.match(build, /generate-release-manifest\.mjs/);
    assert.match(build, /MSHOPS_COMMIT_SHA/);
  });

  it("records operator, MSHOPS commit, artifact hashes, and dist hashes", () => {
    const generator = readFileSync(
      join(root, "scripts", "generate-release-manifest.mjs"),
      "utf8",
    );
    assert.match(generator, /operator:/);
    assert.match(generator, /mshops:/);
    assert.match(generator, /artifact_hashes/);
    assert.match(generator, /dist_hashes/);
    assert.match(generator, /release-manifest\.json/);
  });

  it("exposes a verify:release-manifest npm script", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    assert.equal(pkg.scripts["verify:release-manifest"], "node scripts/verify-release-manifest.mjs");
  });
});

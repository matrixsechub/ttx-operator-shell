import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { proveBundle } from "../../scripts/ci/pearl-bundle-proof.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function distFixture(files) {
  const root = mkdtempSync(path.join(tmpdir(), "bundle-"));
  const assets = path.join(root, "assets");
  mkdirSync(assets, { recursive: true });
  for (const [name, body] of Object.entries(files)) writeFileSync(path.join(assets, name), body);
  return root;
}

describe("pearl bundle proof", () => {
  it("passes a correct bundle: distinct pilot chunk imported by the cockpit chunk, not inlined", () => {
    const root = distFixture({
      "PearlPilotRoute-AAA.js": `export default function(){return "Pearl pilot is not enabled"}`,
      "cockpit-BBB.js": `const r=[{path:"/dashboard/pearl-pilot"}];import("./PearlPilotRoute-AAA.js");`,
      "ecosystem-CCC.js": `console.log("ecosystem")`,
    });
    try {
      const res = proveBundle(root);
      assert.equal(res.ok, true, JSON.stringify(res.findings));
      assert.deepEqual(res.pilotChunks, ["PearlPilotRoute-AAA.js"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails when the pilot logic is eagerly absorbed into the cockpit chunk", () => {
    const root = distFixture({
      "PearlPilotRoute-AAA.js": `export default function(){return "Pearl pilot is not enabled"}`,
      "cockpit-BBB.js": `import("./PearlPilotRoute-AAA.js");/* Pearl pilot is not enabled */`,
    });
    try {
      assert.equal(proveBundle(root).ok, false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails when the pilot chunk is orphaned (no importer)", () => {
    const root = distFixture({
      "PearlPilotRoute-AAA.js": `export default function(){return "Pearl pilot is not enabled"}`,
      "cockpit-BBB.js": `console.log("no import here")`,
    });
    try {
      assert.equal(proveBundle(root).ok, false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails closed when the dist directory is absent", () => {
    assert.throws(() => proveBundle(path.join(tmpdir(), "no-such-dist-xyz")), /dist directory not found/);
  });

  it("asserts the real production dist when present", () => {
    const dist = path.join(REPO, "dist");
    if (!existsSync(dist)) {
      // dist is a build artifact; the qualification matrix runs the CLI post-build.
      return;
    }
    const res = proveBundle(dist);
    assert.equal(res.ok, true, `real dist must pass: ${JSON.stringify(res.findings)}`);
  });
});

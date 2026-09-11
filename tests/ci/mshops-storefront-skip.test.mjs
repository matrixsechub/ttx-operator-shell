import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { shouldSkipMshopsStorefront } from "../../scripts/build.mjs";
import { resolveHtmlSurface, surfaceShellPath } from "../../worker/surfaceRegistry";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("SKIP_MSHOPS_STOREFRONT staging cockpit path", () => {
  it("defaults to requiring MSHOPS (production-safe)", () => {
    assert.equal(shouldSkipMshopsStorefront({}), false);
    assert.equal(shouldSkipMshopsStorefront({ SKIP_MSHOPS_STOREFRONT: "" }), false);
    assert.equal(shouldSkipMshopsStorefront({ SKIP_MSHOPS_STOREFRONT: "0" }), false);
  });

  it("opts in only when SKIP_MSHOPS_STOREFRONT=1", () => {
    assert.equal(shouldSkipMshopsStorefront({ SKIP_MSHOPS_STOREFRONT: "1" }), true);
  });

  it("documents skip gate in build + assemble scripts", () => {
    const build = readFileSync(join(root, "scripts", "build.mjs"), "utf8");
    const assemble = readFileSync(join(root, "scripts", "assemble-operator-dist.mjs"), "utf8");
    assert.match(build, /SKIP_MSHOPS_STOREFRONT/);
    assert.match(assemble, /SKIP_MSHOPS_STOREFRONT/);
    assert.match(build, /MSHOPS_BUILD_DIR/);
    assert.match(build, /build-final/);
  });

  it("wires skip into CI/staging build jobs but not production deploy", () => {
    const buildTest = readFileSync(join(root, ".github", "workflows", "_reusable-build-test.yml"), "utf8");
    const dryRun = readFileSync(join(root, ".github", "workflows", "_reusable-wrangler-dry-run.yml"), "utf8");
    const staging = readFileSync(join(root, ".github", "workflows", "staging-deploy.yml"), "utf8");
    const production = readFileSync(join(root, ".github", "workflows", "deploy-production.yml"), "utf8");
    assert.match(buildTest, /SKIP_MSHOPS_STOREFRONT:\s*"1"/);
    assert.match(dryRun, /SKIP_MSHOPS_STOREFRONT:\s*"1"/);
    assert.match(staging, /SKIP_MSHOPS_STOREFRONT:\s*"1"/);
    assert.doesNotMatch(production, /SKIP_MSHOPS_STOREFRONT/);
    assert.match(production, /MSHOPS_BUILD_DIR/);
  });

  it("keeps Pearl chat/settings on cockpit shell (no MSHOPS dependency)", () => {
    assert.equal(resolveHtmlSurface("/chat"), "cockpit");
    assert.equal(resolveHtmlSurface("/settings/integrations"), "cockpit");
    assert.equal(surfaceShellPath("cockpit"), "/operator-shell.html");
  });
});

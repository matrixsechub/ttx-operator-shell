import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  STAGING_DEPLOY_WORKFLOW_NAME,
  shouldSkipMshopsStorefront,
} from "../../scripts/build.mjs";
import { resolveHtmlSurface, surfaceShellPath } from "../../worker/surfaceRegistry";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("SKIP_MSHOPS_STOREFRONT staging cockpit path", () => {
  it("defaults to requiring MSHOPS (production-safe)", () => {
    assert.equal(shouldSkipMshopsStorefront({}), false);
    assert.equal(shouldSkipMshopsStorefront({ SKIP_MSHOPS_STOREFRONT: "" }), false);
    assert.equal(shouldSkipMshopsStorefront({ SKIP_MSHOPS_STOREFRONT: "0" }), false);
    assert.equal(shouldSkipMshopsStorefront({ GITHUB_WORKFLOW: "CI" }), false);
    assert.equal(shouldSkipMshopsStorefront({ GITHUB_WORKFLOW: "Deploy Production" }), false);
  });

  it("opts in when SKIP_MSHOPS_STOREFRONT=1", () => {
    assert.equal(shouldSkipMshopsStorefront({ SKIP_MSHOPS_STOREFRONT: "1" }), true);
  });

  it("auto-skips on Staging Deploy workflow even without SKIP env (main-dispatch safe)", () => {
    assert.equal(STAGING_DEPLOY_WORKFLOW_NAME, "Staging Deploy");
    assert.equal(
      shouldSkipMshopsStorefront({ GITHUB_WORKFLOW: STAGING_DEPLOY_WORKFLOW_NAME }),
      true,
    );
    // Exact name lock — must match staging-deploy.yml `name:` so reusable jobs inherit it.
    const staging = readFileSync(join(root, ".github", "workflows", "staging-deploy.yml"), "utf8");
    assert.match(staging, /^name:\s*Staging Deploy\s*$/m);
  });

  it("never skips when MSHOPS_BUILD_DIR is set (production artifact wins)", () => {
    assert.equal(
      shouldSkipMshopsStorefront({
        MSHOPS_BUILD_DIR: "/tmp/MSHOPS/build-final",
        SKIP_MSHOPS_STOREFRONT: "1",
        GITHUB_WORKFLOW: STAGING_DEPLOY_WORKFLOW_NAME,
      }),
      false,
    );
  });

  it("documents skip gate in build + assemble scripts", () => {
    const build = readFileSync(join(root, "scripts", "build.mjs"), "utf8");
    const assemble = readFileSync(join(root, "scripts", "assemble-operator-dist.mjs"), "utf8");
    assert.match(build, /SKIP_MSHOPS_STOREFRONT/);
    assert.match(build, /GITHUB_WORKFLOW/);
    assert.match(build, /STAGING_DEPLOY_WORKFLOW_NAME/);
    assert.match(assemble, /shouldSkipMshopsStorefront/);
    assert.match(assemble, /from "\.\/build\.mjs"/);
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
    assert.match(buildTest, /npm run build:staging-cockpit/);
    assert.match(dryRun, /npm run build:staging-cockpit/);
    assert.match(staging, /npm run build:staging-cockpit/);
    assert.doesNotMatch(production, /SKIP_MSHOPS_STOREFRONT/);
    assert.doesNotMatch(production, /build:staging-cockpit/);
    assert.match(production, /MSHOPS_BUILD_DIR/);
    assert.match(production, /npm run build/);
  });

  it("keeps Pearl chat/settings on cockpit shell (no MSHOPS dependency)", () => {
    assert.equal(resolveHtmlSurface("/chat"), "cockpit");
    assert.equal(resolveHtmlSurface("/settings/integrations"), "cockpit");
    assert.equal(surfaceShellPath("cockpit"), "/operator-shell.html");
  });

  it("staging smoke expects marketplace fail-closed when MSHOPS is skipped", () => {
    const smoke = readFileSync(join(root, "scripts", "ci", "staging-smoke.mjs"), "utf8");
    assert.match(smoke, /name:\s*"marketplace_surface"/);
    assert.match(smoke, /expectStatus:\s*503/);
    assert.match(
      smoke,
      /MSHOPS storefront shell missing or misconfigured/,
    );
    assert.match(smoke, /SKIP_MSHOPS_STOREFRONT/);
  });
});

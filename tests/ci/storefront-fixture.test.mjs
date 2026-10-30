import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { FIXTURE_MARKER, fixtureBuildDir, resolveLocalStorefront } from "../../scripts/lib/storefront-source.mjs";
import { checkStorefront } from "../../scripts/ci/assert-real-storefront.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const workflow = (name) => readFileSync(join(root, ".github", "workflows", name), "utf8");

function extractJob(yaml, name) {
  const start = yaml.indexOf(`\n  ${name}:`);
  assert.ok(start >= 0, `${name} job must exist`);
  const fromJob = yaml.slice(start + 1);
  const nextJob = fromJob.slice(1).search(/\n  [a-zA-Z0-9_-]+:/);
  return nextJob === -1 ? fromJob : fromJob.slice(0, nextJob + 1);
}

function tempDist(html) {
  const dir = mkdtempSync(join(tmpdir(), "storefront-"));
  mkdirSync(join(dir, "app"), { recursive: true });
  writeFileSync(join(dir, "app", "index.html"), html);
  return dir;
}

describe("CI sample storefront", () => {
  const html = readFileSync(join(fixtureBuildDir(root), "app", "index.html"), "utf8");

  it("satisfies the shell contract enforced by assemble-operator-dist", () => {
    assert.match(html, /MSH OPS Storefront/);
    assert.match(html, /id="root"/);
    assert.match(html, /\/app\/assets\//);
  });

  it("is marked as a fixture and not indexable", () => {
    assert.ok(html.includes(FIXTURE_MARKER));
    assert.match(html, /noindex/);
  });

  it("contains no external origins or credential-shaped strings", () => {
    const files = [html, readFileSync(join(fixtureBuildDir(root), "app", "assets", "fixture.js"), "utf8")];
    for (const text of files) {
      assert.doesNotMatch(text, /https?:\/\//);
      assert.doesNotMatch(text, /(api[_-]?key|secret|token|password|sk_live|pk_live)/i);
    }
  });
});

describe("storefront source resolution", () => {
  it("uses the sample only when MSHOPS_STOREFRONT=fixture", () => {
    assert.deepEqual(resolveLocalStorefront(root, { MSHOPS_STOREFRONT: "fixture" }), {
      dir: fixtureBuildDir(root),
      fixture: true,
    });
  });

  it("never falls back to the sample", () => {
    const isolatedRoot = mkdtempSync(join(tmpdir(), "ttx-root-"));
    try {
      cpSync(join(root, "fixtures"), join(isolatedRoot, "fixtures"), { recursive: true });
      assert.equal(resolveLocalStorefront(isolatedRoot, {}), null);
    } finally {
      rmSync(isolatedRoot, { recursive: true, force: true });
    }
  });

  it("prefers MSHOPS_BUILD_DIR when set", () => {
    const real = tempDist("<title>MSH OPS Storefront</title>");
    try {
      assert.deepEqual(resolveLocalStorefront(root, { MSHOPS_BUILD_DIR: real }), { dir: real, fixture: false });
    } finally {
      rmSync(real, { recursive: true, force: true });
    }
  });

  it("rejects unknown modes", () => {
    assert.throws(() => resolveLocalStorefront(root, { MSHOPS_STOREFRONT: "real" }), /Unknown MSHOPS_STOREFRONT/);
  });

  it("refuses a missing MSHOPS_BUILD_DIR instead of falling through", () => {
    const missing = join(tmpdir(), "missing-mshops-build-final");
    assert.throws(
      () => resolveLocalStorefront(root, { MSHOPS_BUILD_DIR: missing }),
      /MSHOPS_BUILD_DIR is set but/,
    );
  });

  it("refuses to mix the CI sample with an explicit artifact directory", () => {
    assert.throws(
      () => resolveLocalStorefront(root, { MSHOPS_STOREFRONT: "fixture", MSHOPS_BUILD_DIR: "/tmp/real" }),
      /cannot be combined with MSHOPS_BUILD_DIR/,
    );
  });
});

describe("deploy guard", () => {
  it("refuses a dist built from the sample", () => {
    const dist = tempDist(readFileSync(join(fixtureBuildDir(root), "app", "index.html"), "utf8"));
    try {
      assert.equal(checkStorefront(dist).ok, false);
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });

  it("refuses a dist with no storefront", () => {
    const empty = mkdtempSync(join(tmpdir(), "storefront-empty-"));
    try {
      assert.equal(checkStorefront(empty).ok, false);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it("accepts a real storefront shell", () => {
    const dist = tempDist('<title>MSH OPS Storefront</title><div id="root"></div><script src="/app/assets/i.js"></script>');
    try {
      assert.equal(checkStorefront(dist).ok, true);
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });
});

describe("workflow wiring", () => {
  for (const name of ["_reusable-build-test.yml", "_reusable-wrangler-dry-run.yml"]) {
    it(`${name} builds against the sample storefront`, () => {
      assert.match(workflow(name), /^ {6}MSHOPS_STOREFRONT: fixture$/m);
    });
  }

  for (const [name, jobName] of [
    ["deploy-production.yml", "deploy-production"],
    ["staging-deploy.yml", "deploy-staging"],
  ]) {
    it(`${name} clones the real MSHOPS artifact, then builds, guards, and deploys`, () => {
      const text = workflow(name);
      const deployJob = extractJob(text, jobName);
      const clone = deployJob.indexOf("github.com/${{ github.repository_owner }}/MSHOPS.git");
      const buildDir = deployJob.indexOf("MSHOPS_BUILD_DIR: ${{ github.workspace }}/MSHOPS/build-final");
      const build = deployJob.indexOf("npm run build");
      const guard = deployJob.indexOf("node scripts/ci/assert-real-storefront.mjs");
      const firstWrangler = deployJob.indexOf("npx wrangler deploy");
      assert.ok(clone > 0 && buildDir > clone && build > buildDir, "clone → MSHOPS_BUILD_DIR → build");
      assert.ok(guard > build && firstWrangler > guard, "build → guard → wrangler");
      assert.match(deployJob, /GH_PAT: \$\{\{ secrets\.GH_PAT \}\}/);
      assert.match(deployJob, /persist-credentials: false/);
      assert.doesNotMatch(deployJob, /MSHOPS_STOREFRONT/);
    });
  }

  for (const [name, jobName] of [
    ["deploy-production.yml", "build-test"],
    ["deploy-production.yml", "production-dry-run"],
    ["staging-deploy.yml", "build-test"],
    ["staging-deploy.yml", "staging-dry-run"],
    ["staging-deploy.yml", "staging-smoke"],
  ]) {
    it(`${name} job ${jobName} does not receive GH_PAT`, () => {
      assert.doesNotMatch(extractJob(workflow(name), jobName), /GH_PAT/);
    });
  }

  for (const name of ["_reusable-build-test.yml", "_reusable-wrangler-dry-run.yml", "ci.yml", "security-pr.yml", "organizer-schedule.yml"]) {
    it(`${name} does not clone private MSHOPS or read GH_PAT`, () => {
      const text = workflow(name);
      assert.doesNotMatch(text, /GH_PAT/);
      assert.doesNotMatch(text, /MSHOPS\.git/);
    });
  }
});

import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import {
  FAILURE_CODES,
  PLACEHOLDER_DESCRIPTION,
  extractAssetReferences,
  hasEcosystemShellLeak,
  injectStorefrontSurfaceMarker,
  isPlaceholderHtml,
  validateStorefrontBundle,
} from "../../scripts/lib/storefrontBundle.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const realFixture = join(root, "tests", "fixtures", "storefront-real");
const placeholderFixture = join(root, "scripts", "fixtures", "storefront-placeholder.html");

describe("storefrontBundle", () => {
  it("detects placeholder-only HTML", () => {
    const placeholder = readFileSync(placeholderFixture, "utf8");
    assert.equal(isPlaceholderHtml(placeholder), true);
  });

  it("accepts real bundle HTML with generated assets", () => {
    const html = readFileSync(join(realFixture, "index.html"), "utf8");
    assert.equal(isPlaceholderHtml(html), false);
    assert.deepEqual(extractAssetReferences(html), [
      "/app/assets/index-test.js",
      "/app/assets/index-test.css",
    ]);
  });

  it("validates a real fixture bundle", () => {
    const report = validateStorefrontBundle(realFixture);
    assert.equal(report.ok, true);
    assert.equal(report.placeholderDetected, false);
    assert.ok(report.assetCount >= 2);
  });

  it("fails when entry file is missing", () => {
    const report = validateStorefrontBundle(join(root, "tests", "fixtures", "missing-storefront"));
    assert.equal(report.ok, false);
    assert.ok(report.failureCodes.includes(FAILURE_CODES.ENTRY_MISSING));
  });

  it("fails when referenced assets are missing", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "storefront-broken-"));
    try {
      mkdirSync(join(tempDir, "assets"), { recursive: true });
      writeFileSync(
        join(tempDir, "index.html"),
        `<!doctype html><html><head><title>MSH OPS Storefront</title><script src="/app/assets/missing.js"></script></head><body><div id="root"></div></body></html>`,
      );
      const report = validateStorefrontBundle(tempDir);
      assert.equal(report.ok, false);
      assert.ok(report.failureCodes.includes(FAILURE_CODES.ASSET_REFERENCE_BROKEN));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails placeholder-only entry", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "storefront-placeholder-"));
    try {
      cpSync(placeholderFixture, join(tempDir, "index.html"));
      mkdirSync(join(tempDir, "assets"), { recursive: true });
      writeFileSync(join(tempDir, "assets", ".keep"), "");
      const report = validateStorefrontBundle(tempDir);
      assert.equal(report.ok, false);
      assert.ok(report.failureCodes.includes(FAILURE_CODES.PLACEHOLDER_DETECTED));
      assert.ok(report.errors.some((error) => error.includes(PLACEHOLDER_DESCRIPTION) || error.includes("placeholder")));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when ecosystem shell markers leak into dist/app", () => {
    const fixture = join(root, "tests", "fixtures", "storefront-ecosystem-leak");
    const html = readFileSync(join(fixture, "index.html"), "utf8");
    assert.equal(hasEcosystemShellLeak(html), true);
    const tempDir = mkdtempSync(join(tmpdir(), "storefront-ecosystem-leak-"));
    try {
      mkdirSync(join(tempDir, "assets"), { recursive: true });
      writeFileSync(join(tempDir, "index.html"), html);
      writeFileSync(join(tempDir, "assets", "index-test.js"), "export {};\n");
      writeFileSync(join(tempDir, "assets", "index-test.css"), "body {}\n");
      const report = validateStorefrontBundle(tempDir);
      assert.equal(report.ok, false);
      assert.ok(report.failureCodes.includes(FAILURE_CODES.ECOSYSTEM_SHELL_LEAK));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("injects marketplace surface marker once", () => {
    const html = "<html><head></head><body></body></html>";
    const injected = injectStorefrontSurfaceMarker(html);
    assert.match(injected, /name="mshops-surface"/);
    assert.equal(injectStorefrontSurfaceMarker(injected), injected);
  });
});

describe("assemble-storefront-dist", () => {
  it("fails when source output is missing", () => {
    const artifactPath = join(root, "artifacts", "storefront-assembly-missing-test.json");
    const result = spawnSync(process.execPath, ["scripts/assemble-storefront-dist.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        MSHOPS_ROOT: join(root, "tests", "fixtures", "missing-mshops-root"),
        ARTIFACT_PATH: artifactPath,
      },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr ?? result.stdout ?? "", /STOREFRONT_ASSEMBLY::FAIL/);
    const report = JSON.parse(readFileSync(artifactPath, "utf8"));
    assert.equal(report.status, "fail");
    assert.ok(report.failureCodes.includes(FAILURE_CODES.SOURCE_MISSING));
  });
});

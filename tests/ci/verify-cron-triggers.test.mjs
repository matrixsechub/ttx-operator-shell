import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  FAILURE_CODES,
  hasEcosystemShellLeak,
  validateStorefrontBundle,
} from "../../scripts/lib/storefrontBundle.mjs";
import {
  readAllWranglerCronConfigs,
  validateCronTriggerPolicy,
  workerExportsScheduledHandler,
} from "../../scripts/lib/wranglerCronPolicy.mjs";
import { SMOKE_ROUTE_CONTRACTS } from "../../scripts/ci/staging-smoke.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("wrangler cron trigger policy", () => {
  it("keeps production and staging cron arrays empty in source", () => {
    const configs = readAllWranglerCronConfigs(root);
    const production = configs.find((config) => config.label === "production");
    const staging = configs.find((config) => config.label === "staging");
    assert.ok(production);
    assert.ok(staging);
    assert.deepEqual(production.crons, []);
    assert.deepEqual(staging.crons, []);
  });

  it("passes when no crons are configured and worker has no scheduled() export", () => {
    const result = validateCronTriggerPolicy({ root });
    assert.equal(result.ok, true, result.errors.join("; "));
    assert.equal(result.exportsScheduled, false);
    assert.equal(result.configuredCrons.length, 0);
  });

  it("fails when wrangler declares crons without a scheduled() handler", () => {
    const result = validateCronTriggerPolicy({
      configs: [
        { label: "production", configPath: "wrangler.jsonc", env: null, crons: ["*/5 * * * *"] },
        { label: "staging", configPath: "wrangler.jsonc", env: "staging", crons: [] },
      ],
      exportsScheduled: false,
    });
    assert.equal(result.ok, false);
    assert.match(result.errors.join(" "), /does not export scheduled\(\)/);
    assert.match(result.errors.join(" "), /\*\/5 \* \* \* \*/);
  });

  it("fails when worker exports scheduled() without configured crons", () => {
    const result = validateCronTriggerPolicy({
      configs: readAllWranglerCronConfigs(root),
      exportsScheduled: true,
    });
    assert.equal(result.ok, false);
    assert.match(result.errors.join(" "), /exports scheduled\(\) but no Wrangler triggers\.crons/);
  });

  it("detects scheduled() export in worker source", () => {
    assert.equal(workerExportsScheduledHandler(root), false);
  });
});

describe("marketplace storefront assembly regression", () => {
  it("rejects ecosystem shell HTML copied into dist/app", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "storefront-ecosystem-leak-"));
    try {
      mkdirSync(join(tempDir, "assets"), { recursive: true });
      writeFileSync(
        join(tempDir, "index.html"),
        readFileSync(join(root, "tests", "fixtures", "storefront-ecosystem-leak", "index.html"), "utf8"),
      );
      writeFileSync(join(tempDir, "assets", "index-test.js"), "export {};\n");
      writeFileSync(join(tempDir, "assets", "index-test.css"), "body {}\n");
      const html = readFileSync(join(tempDir, "index.html"), "utf8");
      assert.equal(hasEcosystemShellLeak(html), true);
      const report = validateStorefrontBundle(tempDir);
      assert.equal(report.ok, false);
      assert.ok(report.failureCodes.includes(FAILURE_CODES.ECOSYSTEM_SHELL_LEAK));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("includes public marketplace and operator-view smoke contracts", () => {
    const marketplace = SMOKE_ROUTE_CONTRACTS.find((contract) => contract.name === "marketplace_surface");
    const operatorView = SMOKE_ROUTE_CONTRACTS.find((contract) => contract.name === "marketplace_operator_view");
    assert.ok(marketplace);
    assert.ok(operatorView);
    assert.equal(marketplace.path, "/marketplace");
    assert.equal(operatorView.path, "/marketplace?view=operator");
    assert.equal(marketplace.expectStatus, 200);
    assert.equal(operatorView.expectStatus, 200);
  });
});

describe("marketplace route fixture parity", () => {
  it("accepts the real storefront fixture bundle", () => {
    const fixture = join(root, "tests", "fixtures", "storefront-real");
    const report = validateStorefrontBundle(fixture);
    assert.equal(report.ok, true);
    assert.equal(hasEcosystemShellLeak(readFileSync(join(fixture, "index.html"), "utf8")), false);
  });
});

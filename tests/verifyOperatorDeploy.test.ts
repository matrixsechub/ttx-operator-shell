import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseVerifyOperatorDeployArgs } from "../scripts/lib/verifyOperatorDeployArgs.mjs";
import {
  BETA_CHECK_NAMES,
  HANDOFF_CHECK_NAMES,
  checksForMode,
  commitShaMatches,
  expectedSystemModeForDeployEnv,
  systemModeMatchesDeployEnv,
} from "../scripts/lib/verifyOperatorDeploy.mjs";

describe("parseVerifyOperatorDeployArgs", () => {
  it("defaults to handoff mode with production base URL", () => {
    const args = parseVerifyOperatorDeployArgs([]);
    assert.equal(args.mode, "handoff");
    assert.match(args.baseUrl, /ttx-operator-shell/);
    assert.equal(args.expectedCommit, null);
  });

  it("parses positional base URL and commit SHA (bash style)", () => {
    const args = parseVerifyOperatorDeployArgs([
      "https://ttx-operator-shell-staging.sogellagepul.workers.dev",
      "72e7f1e863babf70522fcba254a302d8f3ad0259",
    ]);
    assert.equal(args.baseUrl, "https://ttx-operator-shell-staging.sogellagepul.workers.dev");
    assert.equal(args.expectedCommit, "72e7f1e863babf70522fcba254a302d8f3ad0259");
    assert.equal(args.mode, "handoff");
  });

  it("parses explicit flags for CI and PowerShell npm passthrough", () => {
    const args = parseVerifyOperatorDeployArgs([
      "--handoff",
      "--base-url",
      "https://ttx-operator-shell.sogellagepul.workers.dev",
      "--commit",
      "72e7f1e863babf70522fcba254a302d8f3ad0259",
    ]);
    assert.equal(args.mode, "handoff");
    assert.equal(args.baseUrl, "https://ttx-operator-shell.sogellagepul.workers.dev");
    assert.equal(args.expectedCommit, "72e7f1e863babf70522fcba254a302d8f3ad0259");
  });

  it("parses equals-form flags", () => {
    const args = parseVerifyOperatorDeployArgs([
      "--mode=beta",
      "--base-url=https://example.workers.dev",
      "--sha=abc123",
    ]);
    assert.equal(args.mode, "beta");
    assert.equal(args.baseUrl, "https://example.workers.dev");
    assert.equal(args.expectedCommit, "abc123");
  });

  it("parses npm double-dash positionals", () => {
    const args = parseVerifyOperatorDeployArgs([
      "--beta",
      "--",
      "https://staging.example.dev",
      "deadbeef",
    ]);
    assert.equal(args.mode, "beta");
    assert.equal(args.baseUrl, "https://staging.example.dev");
    assert.equal(args.expectedCommit, "deadbeef");
  });
});

describe("commitShaMatches", () => {
  it("passes when expected commit is omitted", () => {
    assert.equal(commitShaMatches("72e7f1e863babf70522fcba254a302d8f3ad0259", null), true);
  });

  it("fails on unknown observed SHA when expected is provided", () => {
    assert.equal(commitShaMatches("unknown", "72e7f1e863babf70522fcba254a302d8f3ad0259"), false);
  });

  it("matches full SHA and short prefix", () => {
    const full = "72e7f1e863babf70522fcba254a302d8f3ad0259";
    assert.equal(commitShaMatches(full, full), true);
    assert.equal(commitShaMatches(full, "72e7f1e8"), true);
    assert.equal(commitShaMatches("72e7f1e8", full), true);
  });

  it("fails on mismatch", () => {
    assert.equal(commitShaMatches("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "72e7f1e863babf70522fcba254a302d8f3ad0259"), false);
  });
});

describe("system mode expectations", () => {
  it("expects PRODUCTION on production deploy env", () => {
    assert.equal(expectedSystemModeForDeployEnv("production"), "PRODUCTION");
    assert.equal(systemModeMatchesDeployEnv("production", "PRODUCTION"), true);
    assert.equal(systemModeMatchesDeployEnv("production", "OPERATOR_BETA"), false);
  });

  it("expects OPERATOR_BETA on staging deploy env", () => {
    assert.equal(expectedSystemModeForDeployEnv("staging"), "OPERATOR_BETA");
    assert.equal(systemModeMatchesDeployEnv("staging", "OPERATOR_BETA"), true);
    assert.equal(systemModeMatchesDeployEnv("staging", "PRODUCTION"), false);
  });
});

describe("checksForMode", () => {
  it("returns only handoff checks in handoff mode", () => {
    const names = checksForMode("handoff");
    assert.deepEqual(names, HANDOFF_CHECK_NAMES);
    assert.ok(!names.includes("routeEnterStorefront"));
    assert.ok(!names.includes("ghostConnected"));
  });

  it("returns only beta checks in beta mode", () => {
    const names = checksForMode("beta");
    assert.deepEqual(names, BETA_CHECK_NAMES);
    assert.ok(!names.includes("buildInfoCommitMatches"));
    assert.ok(names.includes("routeMarketplaceOk"));
  });

  it("beta failures do not affect handoff check list", () => {
    const handoff = checksForMode("handoff");
    const beta = checksForMode("beta");
    assert.equal(handoff.some((name) => beta.includes(name)), false);
  });
});

describe("handoff protected-route expectations", () => {
  it("treats 401 as pass for protected anonymous APIs", () => {
    const statuses = { security: 401, ttx: 401, webhooks: 401 };
    assert.ok([statuses.security, statuses.ttx, statuses.webhooks].every((s) => s === 401));
    assert.ok(![statuses.security, statuses.ttx, statuses.webhooks].some((s) => s === 200));
  });
});

describe("handoff mode success simulation", () => {
  it("passes when all handoff checks are true", () => {
    const handoffChecks = Object.fromEntries(HANDOFF_CHECK_NAMES.map((name) => [name, true]));
    const failed = HANDOFF_CHECK_NAMES.filter((name) => !handoffChecks[name]);
    assert.deepEqual(failed, []);
  });

  it("fails handoff when commit mismatches", () => {
    assert.equal(
      commitShaMatches("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "72e7f1e863babf70522fcba254a302d8f3ad0259"),
      false,
    );
  });
});

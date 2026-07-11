import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canonicalizeOrigin,
  resolveStagingTarget,
  validateStagingRedirectChain,
} from "../../../scripts/uiux/staging/targetPolicy.ts";
import { TargetPolicyError } from "../../../scripts/uiux/targetPolicy.ts";

const STAGING = "https://ttx-operator-shell-staging.sogellagepul.workers.dev";
const PRODUCTION = "https://ttx-operator-shell.sogellagepul.workers.dev";

describe("PRISM staging target policy", () => {
  it("accepts exact configured staging origin", () => {
    const prev = process.env.PRISM_STAGING_ORIGIN;
    process.env.PRISM_STAGING_ORIGIN = STAGING;
    const target = resolveStagingTarget(STAGING);
    assert.equal(target.canonicalOrigin, STAGING);
    assert.equal(target.originClass, "staging");
    if (prev) process.env.PRISM_STAGING_ORIGIN = prev;
    else delete process.env.PRISM_STAGING_ORIGIN;
  });

  it("rejects similar-looking hostname suffix match", () => {
    const prev = process.env.PRISM_STAGING_ORIGIN;
    process.env.PRISM_STAGING_ORIGIN = STAGING;
    assert.throws(
      () => resolveStagingTarget("https://evil-ttx-operator-shell-staging.sogellagepul.workers.dev"),
      TargetPolicyError,
    );
    if (prev) process.env.PRISM_STAGING_ORIGIN = prev;
    else delete process.env.PRISM_STAGING_ORIGIN;
  });

  it("rejects production origin for staging validation", () => {
    const prev = process.env.PRISM_STAGING_ORIGIN;
    process.env.PRISM_STAGING_ORIGIN = STAGING;
    assert.throws(() => resolveStagingTarget(PRODUCTION), /Production origin denied/);
    if (prev) process.env.PRISM_STAGING_ORIGIN = prev;
    else delete process.env.PRISM_STAGING_ORIGIN;
  });

  it("requires HTTPS for staging", () => {
    const prev = process.env.PRISM_STAGING_ORIGIN;
    process.env.PRISM_STAGING_ORIGIN = STAGING;
    assert.throws(
      () => resolveStagingTarget("http://ttx-operator-shell-staging.sogellagepul.workers.dev"),
      /HTTPS/,
    );
    if (prev) process.env.PRISM_STAGING_ORIGIN = prev;
    else delete process.env.PRISM_STAGING_ORIGIN;
  });

  it("rejects credential-bearing URLs", () => {
    assert.throws(() => canonicalizeOrigin("https://user:pass@example.com"), /Credential-bearing/);
  });

  it("rejects redirect escape to production", () => {
    assert.throws(
      () => validateStagingRedirectChain(STAGING, [`${PRODUCTION}/redirect`]),
      /staging to production/i,
    );
  });

  it("rejects redirect to unapproved origin", () => {
    assert.throws(
      () => validateStagingRedirectChain(STAGING, ["https://evil.example/redirect"]),
      /unapproved origin/i,
    );
  });
});

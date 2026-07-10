import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveApprovedTarget, validateRedirectChain, TargetPolicyError } from "../../scripts/uiux/targetPolicy.ts";

describe("PRISM target policy", () => {
  it("accepts local preview origin", () => {
    const target = resolveApprovedTarget("http://127.0.0.1:4175");
    assert.equal(target.originClass, "local_preview");
  });

  it("rejects arbitrary external origins", () => {
    assert.throws(() => resolveApprovedTarget("https://evil.example"), TargetPolicyError);
  });

  it("rejects redirect to unapproved origin", () => {
    assert.throws(
      () => validateRedirectChain("http://127.0.0.1:4175", ["https://evil.example/redirect"]),
      /unapproved origin/i,
    );
  });

  it("denies production unless explicitly allowed", () => {
    assert.throws(
      () => resolveApprovedTarget("https://ttx-operator-shell.sogellagepul.workers.dev"),
      /Production origin denied/,
    );
  });
});

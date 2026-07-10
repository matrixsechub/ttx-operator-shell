import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONFIRM_PHRASE,
  authorizeDeployment,
  resolveCommitSha,
  validateConfirmDeploy,
  validateTargetRef,
} from "../../scripts/ci/resolve-deploy-ref.mjs";

describe("resolve-deploy-ref", () => {
  it("accepts the required confirmation phrase", () => {
    assert.equal(validateConfirmDeploy(CONFIRM_PHRASE).ok, true);
  });

  it("rejects incorrect confirmation phrase", () => {
    const result = validateConfirmDeploy("deploy-staging");
    assert.equal(result.ok, false);
    assert.match(result.error ?? "", /DEPLOY_STAGING/);
  });

  it("rejects unsafe pull request refs", () => {
    assert.equal(validateTargetRef("pull/42/merge").ok, false);
    assert.equal(validateTargetRef("refs/pull/42/merge").ok, false);
  });

  it("accepts safe refs", () => {
    assert.equal(validateTargetRef("main").ok, true);
    assert.equal(validateTargetRef("abc123def4567890abc123def4567890abc1234").ok, true);
  });

  it("resolves refs using git rev-parse", () => {
    const sha = "abc123def4567890abc123def4567890abc12345";
    const result = resolveCommitSha("main", () => sha);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.commitSha, sha);
      assert.equal(result.ref, "main");
    }
  });

  it("rejects unresolved refs", () => {
    const result = resolveCommitSha("missing-branch", () => {
      throw new Error("bad ref");
    });
    assert.equal(result.ok, false);
  });

  it("authorizes only when confirmation and ref are valid", () => {
    const sha = "abc123def4567890abc123def4567890abc12345";
    const pass = authorizeDeployment(CONFIRM_PHRASE, "main", () => sha);
    assert.equal(pass.ok, true);

    const fail = authorizeDeployment("nope", "main", () => sha);
    assert.equal(fail.ok, false);
  });
});

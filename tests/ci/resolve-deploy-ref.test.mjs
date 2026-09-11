import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONFIRM_PHRASE,
  authorizeDeployment,
  resolveCommitSha,
  validateConfirmDeploy,
  validateTargetRef,
} from "../../scripts/ci/resolve-deploy-ref.mjs";

const EXACT_HEAD = "648eba273122d1f978011957dd2ef35e64b7994e";

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

  it("rejects mutable/default refs including main", () => {
    assert.equal(validateTargetRef("main").ok, false);
    assert.equal(validateTargetRef("master").ok, false);
    assert.equal(validateTargetRef("cursor/pearl-chat-settings-preview-3ba2").ok, false);
    assert.equal(validateTargetRef("v1.2.3").ok, false);
    assert.equal(validateTargetRef("648eba2").ok, false);
    assert.equal(validateTargetRef("648eba273122d1f978011957dd2ef35e64b7994").ok, false);
    assert.match(validateTargetRef("main").error ?? "", /full 40-char commit SHA/);
  });

  it("accepts only a full 40-char commit SHA", () => {
    assert.equal(validateTargetRef(EXACT_HEAD).ok, true);
    assert.equal(validateTargetRef(EXACT_HEAD.toUpperCase()).ok, true);
  });

  it("resolves a full SHA and requires resolved SHA to match requested ref", () => {
    const result = resolveCommitSha(EXACT_HEAD, () => EXACT_HEAD);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.commitSha, EXACT_HEAD);
      assert.equal(result.ref, EXACT_HEAD);
    }

    const mismatch = resolveCommitSha(EXACT_HEAD, () => "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    assert.equal(mismatch.ok, false);
    assert.match(mismatch.error ?? "", /does not match requested target_ref/);
  });

  it("rejects unresolved refs", () => {
    const result = resolveCommitSha(EXACT_HEAD, () => {
      throw new Error("bad ref");
    });
    assert.equal(result.ok, false);
  });

  it("authorizes only when confirmation and exact SHA are valid", () => {
    const pass = authorizeDeployment(CONFIRM_PHRASE, EXACT_HEAD, () => EXACT_HEAD);
    assert.equal(pass.ok, true);
    if (pass.ok) {
      assert.equal(pass.ref, EXACT_HEAD);
      assert.equal(pass.commitSha, EXACT_HEAD);
    }

    const wrongDefault = authorizeDeployment(CONFIRM_PHRASE, "main", () => EXACT_HEAD);
    assert.equal(wrongDefault.ok, false);
    assert.match(wrongDefault.error ?? "", /full 40-char commit SHA/);

    const failConfirm = authorizeDeployment("nope", EXACT_HEAD, () => EXACT_HEAD);
    assert.equal(failConfirm.ok, false);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONFIRM_PHRASE,
  CONFIRM_PHRASES,
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

  it("rejects refs with shell metacharacters or traversal", () => {
    for (const ref of ['main"; rm -rf / #', "$(id)", "main`id`", "a b", "main..evil", "x;y"]) {
      assert.equal(validateTargetRef(ref).ok, false, ref);
    }
  });

  it("keeps staging on its own phrase", () => {
    const sha = "abc123def4567890abc123def4567890abc12345";
    assert.equal(authorizeDeployment(CONFIRM_PHRASES.production, "main", () => sha).ok, false);
    assert.equal(authorizeDeployment(CONFIRM_PHRASE, "main", () => sha, "staging").ok, true);
  });
});

describe("resolve-deploy-ref production", () => {
  const sha = "abc123def4567890abc123def4567890abc12345";

  it("requires the production phrase", () => {
    assert.equal(CONFIRM_PHRASES.production, "DEPLOY_PRODUCTION");
    const fail = authorizeDeployment(CONFIRM_PHRASE, "main", () => sha, "production");
    assert.equal(fail.ok, false);
    assert.match(fail.error ?? "", /DEPLOY_PRODUCTION/);
  });

  it("authorizes a commit that is on origin/main", () => {
    const calls = [];
    const exec = (cmd) => {
      calls.push(cmd);
      return cmd.startsWith("git rev-parse") ? sha : "";
    };
    const pass = authorizeDeployment("DEPLOY_PRODUCTION", "main", exec, "production");
    assert.equal(pass.ok, true);
    assert.ok(calls.some((cmd) => cmd === `git merge-base --is-ancestor "${sha}" "origin/main"`));
  });

  it("refuses a commit that is not on origin/main", () => {
    const exec = (cmd) => {
      if (cmd.startsWith("git merge-base")) throw new Error("not ancestor");
      return sha;
    };
    const fail = authorizeDeployment("DEPLOY_PRODUCTION", "feature/x", exec, "production");
    assert.equal(fail.ok, false);
    assert.match(fail.error ?? "", /not on origin\/main/);
  });

  it("rejects unknown deploy targets", () => {
    assert.equal(authorizeDeployment("DEPLOY_PRODUCTION", "main", () => sha, "prod").ok, false);
  });
});

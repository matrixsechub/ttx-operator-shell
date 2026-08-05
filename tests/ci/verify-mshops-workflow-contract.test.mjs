import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  assertMshopsCheckoutTokenPresent,
  validateMshopsCheckoutLayout,
} from "../../scripts/ci/preflight-mshops-checkout.mjs";
import { verifyMshopsWorkflowContract } from "../../scripts/ci/verify-mshops-workflow-contract.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("verify-mshops-workflow-contract", () => {
  it("passes on repository workflow contract", () => {
    const result = verifyMshopsWorkflowContract(root);
    assert.equal(result.ok, true, result.errors?.join("; "));
  });

  it("requires pinned checkout action in checkout-mshops composite", () => {
    const action = readFileSync(
      join(root, ".github", "actions", "checkout-mshops", "action.yml"),
      "utf8",
    );
    assert.match(action, /actions\/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5/);
    assert.match(action, /persist-credentials: false/);
    assert.match(action, /mshops-checkout-token/);
  });

  it("uses MSHOPS_CHECKOUT_TOKEN in trusted consumers", () => {
    for (const file of [
      ".github/workflows/_reusable-build-test.yml",
      ".github/workflows/_reusable-wrangler-dry-run.yml",
      ".github/workflows/staging-deploy.yml",
    ]) {
      const text = readFileSync(join(root, file), "utf8");
      assert.match(text, /secrets\.MSHOPS_CHECKOUT_TOKEN/);
      assert.doesNotMatch(text, /token:\s*\$\{\{\s*secrets\.GITHUB_TOKEN\s*\}\}/);
    }
  });

  it("guards fork PR private checkout in ci.yml", () => {
    const ci = readFileSync(join(root, ".github", "workflows", "ci.yml"), "utf8");
    assert.match(ci, /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
    assert.match(ci, /fork-pr-storefront-blocked/);
    assert.doesNotMatch(ci, /pull_request_target/);
  });
});

describe("preflight-mshops-checkout", () => {
  it("fails closed when token is missing", () => {
    const prior = process.env.MSHOPS_CHECKOUT_TOKEN;
    delete process.env.MSHOPS_CHECKOUT_TOKEN;
    assert.throws(() => assertMshopsCheckoutTokenPresent(), (error) => {
      return error.code === "MSHOPS_CHECKOUT_TOKEN_MISSING";
    });
    if (prior !== undefined) process.env.MSHOPS_CHECKOUT_TOKEN = prior;
  });

  it("fails when checkout root is missing", () => {
    assert.throws(
      () => validateMshopsCheckoutLayout(join(root, "tests", "fixtures", "missing-mshops-root")),
      (error) => error.code === "MSHOPS_CHECKOUT_MISSING",
    );
  });
});

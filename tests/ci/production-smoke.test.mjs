import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateProductionBaseUrl } from "../../scripts/lib/productionBaseUrl.mjs";
import { evaluateBuildIdentity, runProductionSmoke } from "../../scripts/ci/production-smoke.mjs";
import { buildSmokeRequestHeaders } from "../../scripts/ci/staging-smoke.mjs";

const PROD = "https://ttx-operator-shell.sogellagepul.workers.dev";

describe("validateProductionBaseUrl", () => {
  it("accepts the exact production host and normalizes a trailing slash", () => {
    assert.deepEqual(validateProductionBaseUrl(PROD), { ok: true, baseUrl: PROD });
    assert.deepEqual(validateProductionBaseUrl(`${PROD}/`), { ok: true, baseUrl: PROD });
  });

  it("rejects anything that is not the allowlisted production host", () => {
    for (const bad of [
      undefined,
      "",
      "not-a-url",
      "http://ttx-operator-shell.sogellagepul.workers.dev",
      "https://ttx-operator-shell-staging.sogellagepul.workers.dev",
      "https://evil.example.com",
      "https://user:pw@ttx-operator-shell.sogellagepul.workers.dev",
      "https://ttx-operator-shell.sogellagepul.workers.dev:8443",
      "https://ttx-operator-shell.sogellagepul.workers.dev/path",
      "https://ttx-operator-shell.sogellagepul.workers.dev?q=1",
    ]) {
      assert.equal(validateProductionBaseUrl(bad).ok, false, `must reject ${String(bad)}`);
    }
  });
});

describe("evaluateBuildIdentity (F4 regression)", () => {
  const sha = "0123456789abcdef0123456789abcdef01234567";

  it("fails when the deployed build reports an unknown commit", () => {
    const out = evaluateBuildIdentity({ commitSha: "unknown", deployEnv: "production" }, sha);
    assert.equal(out.result, "FAIL");
    assert.match(out.notes.join(" "), /unknown/);
  });

  it("fails when commitSha is absent", () => {
    assert.equal(evaluateBuildIdentity({ deployEnv: "production" }, sha).result, "FAIL");
  });

  it("fails when the deployed commit is not the one we shipped", () => {
    const out = evaluateBuildIdentity({ commitSha: "f".repeat(40), deployEnv: "production" }, sha);
    assert.equal(out.result, "FAIL");
    assert.match(out.notes.join(" "), /does not match/);
  });

  it("fails when the worker reports a non-production deployEnv", () => {
    const out = evaluateBuildIdentity({ commitSha: sha, deployEnv: "staging" }, sha);
    assert.equal(out.result, "FAIL");
    assert.match(out.notes.join(" "), /deployEnv/);
  });

  it("passes on an exact match and on a short-SHA prefix", () => {
    assert.equal(evaluateBuildIdentity({ commitSha: sha, deployEnv: "production" }, sha).result, "PASS");
    assert.equal(evaluateBuildIdentity({ commitSha: sha, deployEnv: "production" }, sha.slice(0, 7)).result, "PASS");
  });
});

describe("runProductionSmoke", () => {
  it("refuses a non-production target before any network call", async () => {
    await assert.rejects(
      () => runProductionSmoke("https://ttx-operator-shell-staging.sogellagepul.workers.dev", "abc"),
      /not allowlisted/,
    );
  });
});

describe("smoke probe reuse seam", () => {
  const contract = { contentTypeIncludes: "application/json" };

  it("omits Cloudflare Access headers when no credentials are supplied (production)", () => {
    const headers = buildSmokeRequestHeaders(contract, {});
    assert.equal(headers["CF-Access-Client-Id"], undefined);
    assert.equal(headers["CF-Access-Client-Secret"], undefined);
    assert.equal(headers.Accept, "application/json");
  });

  it("still attaches both Access headers when credentials are supplied (staging)", () => {
    const headers = buildSmokeRequestHeaders(contract, { clientId: "id", clientSecret: "secret" });
    assert.equal(headers["CF-Access-Client-Id"], "id");
    assert.equal(headers["CF-Access-Client-Secret"], "secret");
  });
});

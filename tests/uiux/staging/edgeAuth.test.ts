import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readCfAccessServiceTokenHeaders, withCfAccessHeaders } from "../../../scripts/uiux/staging/cfAccess.ts";
import { bootstrapEdgeApiToken } from "../../../scripts/uiux/staging/edgeAuth.ts";

describe("PRISM staging CF Access headers", () => {
  it("returns empty headers when service token env is unset", () => {
    const prevId = process.env.PRISM_CF_ACCESS_CLIENT_ID;
    const prevSecret = process.env.PRISM_CF_ACCESS_CLIENT_SECRET;
    delete process.env.PRISM_CF_ACCESS_CLIENT_ID;
    delete process.env.PRISM_CF_ACCESS_CLIENT_SECRET;
    delete process.env.CF_ACCESS_CLIENT_ID;
    delete process.env.CF_ACCESS_CLIENT_SECRET;

    assert.deepEqual(readCfAccessServiceTokenHeaders(), {});

    if (prevId) process.env.PRISM_CF_ACCESS_CLIENT_ID = prevId;
    if (prevSecret) process.env.PRISM_CF_ACCESS_CLIENT_SECRET = prevSecret;
  });

  it("merges CF Access service token headers when configured", () => {
    const prevId = process.env.PRISM_CF_ACCESS_CLIENT_ID;
    const prevSecret = process.env.PRISM_CF_ACCESS_CLIENT_SECRET;
    process.env.PRISM_CF_ACCESS_CLIENT_ID = "test-client-id";
    process.env.PRISM_CF_ACCESS_CLIENT_SECRET = "test-client-secret";

    const headers = withCfAccessHeaders({ Authorization: "Bearer example" });
    assert.equal(headers.get("Authorization"), "Bearer example");
    assert.equal(headers.get("CF-Access-Client-Id"), "test-client-id");
    assert.equal(headers.get("CF-Access-Client-Secret"), "test-client-secret");

    if (prevId) process.env.PRISM_CF_ACCESS_CLIENT_ID = prevId;
    else delete process.env.PRISM_CF_ACCESS_CLIENT_ID;
    if (prevSecret) process.env.PRISM_CF_ACCESS_CLIENT_SECRET = prevSecret;
    else delete process.env.PRISM_CF_ACCESS_CLIENT_SECRET;
  });
});

describe("PRISM staging edge auth", () => {
  it("fails closed without credentials or preconfigured token", async () => {
    const prevPassword = process.env.PRISM_OPERATOR_PASSWORD;
    const prevToken = process.env.OPERATOR_BEARER_TOKEN;
    delete process.env.PRISM_OPERATOR_PASSWORD;
    delete process.env.OPERATOR_PASSWORD;
    delete process.env.OPERATOR_BEARER_TOKEN;
    delete process.env.PRISM_OPERATOR_EDGE_TOKEN;

    const result = await bootstrapEdgeApiToken("https://ttx-operator-shell-staging.sogellagepul.workers.dev");
    assert.equal(result.ok, false);

    if (prevPassword) process.env.PRISM_OPERATOR_PASSWORD = prevPassword;
    if (prevToken) process.env.OPERATOR_BEARER_TOKEN = prevToken;
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { edgeAuthGate } from "../worker/edge/gate.ts";
import { handleHsxEdgeRoute } from "../worker/hsxEdge.ts";
import { handleMarketplaceEdgeRoute } from "../worker/marketplaceEdge.ts";

const MARKETPLACE_KEY = "marketplace-test-key";
const OPERATOR_KEY = "operator-test-key";
const CLIENT_IP = "203.0.113.10";
const USER_AGENT = "matrixsechub-test-agent";

function sessionRequest(path: string): Request {
  return new Request(`https://example.com${path}`, {
    method: "POST",
    headers: {
      "CF-Connecting-IP": CLIENT_IP,
      "User-Agent": USER_AGENT,
    },
  });
}

function protectedRequest(path: string, token: string, method = "GET"): Request {
  return new Request(`https://example.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "CF-Connecting-IP": CLIENT_IP,
      "User-Agent": USER_AGENT,
    },
  });
}

async function tokenFrom(response: Response | null): Promise<string> {
  assert.ok(response);
  assert.equal(response.status, 200);
  const body = (await response.json()) as { token?: string };
  assert.ok(body.token);
  return body.token;
}

describe("marketplace edge trust domain", () => {
  it("refuses to issue a marketplace token from the operator key", async () => {
    const response = await handleMarketplaceEdgeRoute(
      sessionRequest("/api/marketplace/session"),
      "/api/marketplace/session",
      { OPERATOR_SECRET: OPERATOR_KEY } as unknown as { MARKETPLACE_SECRET?: string },
    );

    assert.ok(response);
    assert.equal(response.status, 503);
  });

  it("issues a context-bound marketplace token that passes the marketplace gate", async () => {
    const token = await tokenFrom(
      await handleMarketplaceEdgeRoute(
        sessionRequest("/api/marketplace/session"),
        "/api/marketplace/session",
        { MARKETPLACE_SECRET: MARKETPLACE_KEY },
      ),
    );

    const blocked = await edgeAuthGate(
      protectedRequest("/api/marketplace/integrity", token),
      "/api/marketplace/integrity",
      { MARKETPLACE_SECRET: MARKETPLACE_KEY, OPERATOR_SECRET: OPERATOR_KEY },
    );

    assert.equal(blocked, null);
  });

  it("rejects a marketplace token when the client context changes", async () => {
    const token = await tokenFrom(
      await handleMarketplaceEdgeRoute(
        sessionRequest("/api/marketplace/session"),
        "/api/marketplace/session",
        { MARKETPLACE_SECRET: MARKETPLACE_KEY },
      ),
    );

    const request = new Request("https://example.com/api/marketplace/integrity", {
      headers: {
        Authorization: `Bearer ${token}`,
        "CF-Connecting-IP": "203.0.113.11",
        "User-Agent": USER_AGENT,
      },
    });
    const blocked = await edgeAuthGate(request, "/api/marketplace/integrity", {
      MARKETPLACE_SECRET: MARKETPLACE_KEY,
      OPERATOR_SECRET: OPERATOR_KEY,
    });

    assert.ok(blocked);
    assert.equal(blocked.status, 403);
    const body = (await blocked.json()) as { reason?: string };
    assert.equal(body.reason, "binding_mismatch");
  });
});

describe("HSX edge trust domain", () => {
  it("refuses to issue an HSX token from the operator key", async () => {
    const response = await handleHsxEdgeRoute(
      sessionRequest("/api/hsx/session"),
      "/api/hsx/session",
      { OPERATOR_SECRET: OPERATOR_KEY } as unknown as { MARKETPLACE_SECRET?: string },
    );

    assert.ok(response);
    assert.equal(response.status, 503);
  });

  it("issues an HSX token that passes the marketplace-class edge gate", async () => {
    const token = await tokenFrom(
      await handleHsxEdgeRoute(sessionRequest("/api/hsx/session"), "/api/hsx/session", {
        MARKETPLACE_SECRET: MARKETPLACE_KEY,
      }),
    );

    const blocked = await edgeAuthGate(
      protectedRequest("/api/hsx", token, "POST"),
      "/api/hsx",
      { MARKETPLACE_SECRET: MARKETPLACE_KEY, OPERATOR_SECRET: OPERATOR_KEY },
    );

    assert.equal(blocked, null);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { proxySurfaceApiToOrigin, shouldProxySurfaceApi } from "../worker/surfaceApiProxy.ts";

describe("surface API capability isolation", () => {
  it("keeps the primary storefront worker on local backbone handlers", async () => {
    let called = false;
    const response = await proxySurfaceApiToOrigin(
      new Request("https://ttx.example/api/system/state"),
      new URL("https://ttx.example/api/system/state"),
      { ORIGIN_URL: "https://origin.example" },
      "storefront",
      async () => {
        called = true;
        return new Response("unexpected");
      },
    );

    assert.equal(shouldProxySurfaceApi("storefront"), false);
    assert.equal(response, null);
    assert.equal(called, false);
  });

  it("proxies public-surface APIs to the canonical origin before local backbone access", async () => {
    let observed: Request | null = null;
    const response = await proxySurfaceApiToOrigin(
      new Request("https://public.example/api/system/state?view=compact", {
        headers: { Authorization: "Bearer edge-token" },
      }),
      new URL("https://public.example/api/system/state?view=compact"),
      { ORIGIN_URL: "https://ttx.example" },
      "public",
      async (input) => {
        observed = input instanceof Request ? input : new Request(input);
        return Response.json({ ok: true }, { status: 200 });
      },
    );

    assert.equal(shouldProxySurfaceApi("public"), true);
    assert.ok(response);
    assert.equal(response?.status, 200);
    assert.equal(response?.headers.get("X-Proxied-By"), "mshops-public-worker");
    assert.ok(observed);
    assert.equal(observed?.url, "https://ttx.example/api/system/state?view=compact");
    assert.equal(observed?.headers.get("Authorization"), "Bearer edge-token");
    assert.equal(observed?.headers.get("X-Forwarded-Host"), "public.example");
    assert.equal(observed?.headers.get("X-MSHOPS-Surface"), "public");
  });

  it("proxies operator-surface APIs to the canonical origin", async () => {
    const response = await proxySurfaceApiToOrigin(
      new Request("https://operator.example/api/governance/state"),
      new URL("https://operator.example/api/governance/state"),
      { ORIGIN_URL: "https://ttx.example" },
      "operator",
      async () => new Response("proxied", { status: 202 }),
    );

    assert.equal(shouldProxySurfaceApi("operator"), true);
    assert.equal(response?.status, 202);
    assert.equal(response?.headers.get("X-Proxied-By"), "mshops-operator-worker");
  });

  it("fails closed when the surface origin is missing", async () => {
    const response = await proxySurfaceApiToOrigin(
      new Request("https://public.example/api/system/state"),
      new URL("https://public.example/api/system/state"),
      {},
      "public",
    );

    assert.equal(response?.status, 503);
    assert.deepEqual(await response?.json(), {
      error: "Surface origin is not configured",
      code: "SURFACE_ORIGIN_UNAVAILABLE",
    });
  });

  it("fails closed instead of creating a self-proxy loop", async () => {
    const response = await proxySurfaceApiToOrigin(
      new Request("https://operator.example/api/system/state"),
      new URL("https://operator.example/api/system/state"),
      { ORIGIN_URL: "https://operator.example" },
      "operator",
    );

    assert.equal(response?.status, 503);
    assert.deepEqual(await response?.json(), {
      error: "Surface origin would create a proxy loop",
      code: "SURFACE_ORIGIN_LOOP",
    });
  });

  it("returns a bounded gateway failure when the canonical origin is unreachable", async () => {
    const response = await proxySurfaceApiToOrigin(
      new Request("https://public.example/api/system/state"),
      new URL("https://public.example/api/system/state"),
      { ORIGIN_URL: "https://ttx.example" },
      "public",
      async () => {
        throw new Error("network unavailable");
      },
    );

    assert.equal(response?.status, 502);
    const body = (await response?.json()) as { code?: string; detail?: string };
    assert.equal(body.code, "SURFACE_ORIGIN_UNREACHABLE");
    assert.equal(body.detail, "network unavailable");
  });
});

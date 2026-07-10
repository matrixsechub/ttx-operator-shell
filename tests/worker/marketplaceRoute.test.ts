import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveHtmlSurface, surfaceShellPath } from "../../worker/surfaceRegistry.ts";

describe("marketplace HTML routing", () => {
  it("maps /marketplace to the storefront shell regardless of query string handling upstream", () => {
    assert.equal(resolveHtmlSurface("/marketplace"), "storefront");
    assert.equal(surfaceShellPath("storefront"), "/app/index.html");
  });

  it("keeps nested marketplace client routes on the storefront shell", () => {
    assert.equal(resolveHtmlSurface("/marketplace/modules/catalog"), "storefront");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveHtmlSurface, surfaceShellPath } from "../../worker/surfaceRegistry.ts";

describe("surfaceRegistry storefront routing", () => {
  it("serves ecosystem shell at /", () => {
    assert.equal(resolveHtmlSurface("/"), "ecosystem");
    assert.equal(surfaceShellPath("ecosystem"), "/ecosystem-shell.html");
  });

  it("serves storefront shell for marketplace routes", () => {
    assert.equal(resolveHtmlSurface("/marketplace"), "storefront");
    assert.equal(resolveHtmlSurface("/marketplace/"), "storefront");
    assert.equal(resolveHtmlSurface("/marketplace/modules/foo"), "storefront");
    assert.equal(surfaceShellPath("storefront"), "/app/index.html");
  });

  it("keeps operator routes on cockpit shell", () => {
    assert.equal(resolveHtmlSurface("/systems"), "cockpit");
    assert.equal(resolveHtmlSurface("/ttx"), "cockpit");
    assert.equal(resolveHtmlSurface("/dashboard"), "cockpit");
    assert.equal(surfaceShellPath("cockpit"), "/operator-shell.html");
  });

  it("keeps auth shell for /login", () => {
    assert.equal(resolveHtmlSurface("/login"), "auth");
    assert.equal(surfaceShellPath("auth"), "/auth-shell.html");
  });
});

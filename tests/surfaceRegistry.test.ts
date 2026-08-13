import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { resolveHtmlSurface, surfaceShellPath } from "../worker/surfaceRegistry";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("surfaceRegistry storefront contract", () => {
  it("maps /marketplace to storefront shell at /app/index.html", () => {
    assert.equal(resolveHtmlSurface("/marketplace"), "storefront");
    assert.equal(surfaceShellPath("storefront"), "/app/index.html");
  });

  it("maps /marketplace category paths to storefront", () => {
    assert.equal(resolveHtmlSurface("/marketplace/mission-packs"), "storefront");
  });

  it("maps Pearl OS storefront routes to storefront", () => {
    assert.equal(resolveHtmlSurface("/products"), "storefront");
    assert.equal(resolveHtmlSurface("/pearl-os"), "storefront");
    assert.equal(resolveHtmlSurface("/flywheel"), "storefront");
    assert.equal(resolveHtmlSurface("/gates"), "storefront");
    assert.equal(resolveHtmlSurface("/vault"), "storefront");
    assert.equal(resolveHtmlSurface("/blog"), "storefront");
    assert.equal(resolveHtmlSurface("/academy"), "storefront");
    assert.equal(resolveHtmlSurface("/brand"), "storefront");
    assert.equal(resolveHtmlSurface("/portfolio"), "storefront");
    assert.equal(resolveHtmlSurface("/book"), "storefront");
  });

  it("does not map /systems to storefront", () => {
    assert.equal(resolveHtmlSurface("/systems"), "cockpit");
  });

  it("maps /operator to the auth-gated cockpit shell", () => {
    assert.equal(resolveHtmlSurface("/operator"), "cockpit");
  });
});

describe("assemble-operator-dist script", () => {
  it("requires storefront shell and build manifest output", () => {
    const script = readFileSync(join(root, "scripts", "assemble-operator-dist.mjs"), "utf8");
    assert.match(script, /app\/index\.html/);
    assert.match(script, /MSH OPS Storefront/);
    assert.match(script, /\.build-manifest\.json/);
    assert.doesNotMatch(script, /will degrade until MSHOPS/);
  });
});

describe("build pipeline storefront integration", () => {
  it("uses MSHOPS build-final artifact (Option C)", () => {
    const script = readFileSync(join(root, "scripts", "build.mjs"), "utf8");
    assert.match(script, /MSHOPS/);
    assert.match(script, /build-final/);
    assert.match(script, /assemble-operator-dist\.mjs/);
  });
});

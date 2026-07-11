import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { validateSurfaceShellHtml } from "../../worker/surfaceSpa.ts";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf8");
}

describe("surfaceSpa ecosystem shell validation", () => {
  it("accepts the Vite React ecosystem shell markers", () => {
    const html = loadFixture("ecosystem-shell-valid.html");
    assert.equal(validateSurfaceShellHtml(html, "ecosystem"), true);
  });

  it("rejects the static MSHOPS ecosystem overview page", () => {
    const html = loadFixture("ecosystem-shell-static-overview.html");
    assert.equal(validateSurfaceShellHtml(html, "ecosystem"), false);
  });

  it("rejects storefront shell markers on ecosystem surface", () => {
    const html = '<html><body><div id="root">MSH OPS Storefront</div></body></html>';
    assert.equal(validateSurfaceShellHtml(html, "ecosystem"), false);
  });
});

describe("surfaceSpa step counter regression", () => {
  it("does not treat Step 1 of 3 alone as a valid ecosystem shell", () => {
    const html = '<html><body><p>Step 1 of 3</p></body></html>';
    assert.equal(validateSurfaceShellHtml(html, "ecosystem"), false);
  });
});

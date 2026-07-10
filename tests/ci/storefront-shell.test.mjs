import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("storefront shell build contract", () => {
  it("defines storefront html entry with required title marker", () => {
    const html = readFileSync(join(root, "storefront.html"), "utf8");
    assert.match(html, /MSH OPS Storefront/);
    assert.match(html, /id="root"/);
  });

  it("includes built storefront shell when dist/app exists", () => {
    const shellPath = join(root, "dist", "app", "index.html");
    if (!existsSync(shellPath)) {
      return;
    }
    const html = readFileSync(shellPath, "utf8");
    assert.match(html, /MSH OPS Storefront/);
    assert.match(html, /\/app\/assets\//);
  });
});

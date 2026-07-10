import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAllowedDestination, sanitizeDestination } from "../worker/activation/destinationAllowlist.ts";

describe("activation destination allowlist", () => {
  it("allows known paths", () => {
    assert.equal(isAllowedDestination("/marketplace"), true);
    assert.equal(isAllowedDestination("/intake"), true);
  });

  it("falls back to root for unknown paths", () => {
    assert.equal(sanitizeDestination("/admin/delete"), "/");
  });
});

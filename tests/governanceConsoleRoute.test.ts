import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("Governance Console route", () => {
  it("registers /operator/governance in cockpit router", () => {
    const source = readFileSync(join(root, "src", "routes", "cockpitRouter.tsx"), "utf8");
    assert.match(source, /path:\s*"\/operator\/governance"/);
  });
});

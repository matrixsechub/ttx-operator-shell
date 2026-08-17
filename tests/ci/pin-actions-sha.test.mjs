import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function walkYaml(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkYaml(full, acc);
      continue;
    }
    if (entry.endsWith(".yml") || entry.endsWith(".yaml")) acc.push(full);
  }
  return acc;
}

describe("third-party GitHub Actions are SHA-pinned", () => {
  it("has no mutable version tags on external actions under .github", () => {
    const files = [
      ...walkYaml(join(root, ".github", "workflows")),
      ...walkYaml(join(root, ".github", "actions")),
    ];
    const mutable = [];
    for (const file of files) {
      const rel = file.slice(root.length + 1).replace(/\\/g, "/");
      for (const line of readFileSync(file, "utf8").split("\n")) {
        const match = line.match(/^\s*-\s*uses:\s*(.+?)\s*(?:#.*)?$/);
        if (!match) continue;
        const reference = match[1].trim();
        if (reference.startsWith("./") || reference.startsWith(".github/")) continue;
        const at = reference.lastIndexOf("@");
        assert.ok(at > 0, `${rel}: missing @ ref in ${reference}`);
        const ref = reference.slice(at + 1);
        if (!/^[0-9a-f]{40}$/i.test(ref)) {
          mutable.push(`${rel}::${reference}`);
        }
      }
    }
    assert.deepEqual(mutable, []);
  });
});

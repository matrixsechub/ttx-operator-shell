#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const beaconPath = join(root, "msh-ops", "beacon", "northstar.json");

function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortKeys(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function canonicalizeBeacon(doc) {
  return JSON.stringify(sortKeys(doc));
}

const raw = JSON.parse(readFileSync(beaconPath, "utf8"));
const canonical = canonicalizeBeacon(raw);
const hash = createHash("sha256").update(canonical, "utf8").digest("hex");
const hashPath = join(root, "msh-ops", "beacon", "beacon.hash");
const hashTsPath = join(root, "msh-ops", "beacon", "beaconHash.ts");

console.log("Canonical payload:");
console.log(canonical);
console.log("");
console.log(`EXPECTED_BEACON_SHA256 = "${hash}"`);
writeFileSync(hashPath, `${hash}\n`, "utf8");
writeFileSync(
  hashTsPath,
  `// Auto-synced from beacon.hash by scripts/compute-beacon-hash.mjs — do not edit manually.\nexport const EXPECTED_BEACON_SHA256 =\n  "${hash}";\n`,
  "utf8",
);
console.log(`Wrote ${hashPath}`);
console.log(`Wrote ${hashTsPath}`);

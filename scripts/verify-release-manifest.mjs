#!/usr/bin/env node

/**
 * Verify committed release-manifest.json against current dist/ hashes.
 * Exit 0 when hashes match; exit 1 on mismatch or missing inputs.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const manifestPath = join(root, "release-manifest.json");

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function main() {
  if (!existsSync(manifestPath)) {
    console.error("RELEASE_MANIFEST::VERIFY_FAIL::missing release-manifest.json");
    process.exit(1);
  }
  if (!existsSync(dist)) {
    console.error("RELEASE_MANIFEST::VERIFY_FAIL::missing dist/");
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const required = ["operator", "mshops", "artifact_hashes", "dist_hashes"];
  for (const key of required) {
    if (!(key in manifest)) {
      console.error(`RELEASE_MANIFEST::VERIFY_FAIL::missing field ${key}`);
      process.exit(1);
    }
  }

  if (!manifest.operator?.commit_sha || !manifest.mshops?.commit_sha) {
    console.error("RELEASE_MANIFEST::VERIFY_FAIL::missing commit sha fields");
    process.exit(1);
  }

  const mismatches = [];
  for (const [rel, expected] of Object.entries(manifest.artifact_hashes ?? {})) {
    const full = join(dist, rel);
    if (!existsSync(full)) {
      mismatches.push({ rel, reason: "missing" });
      continue;
    }
    const actual = sha256File(full);
    if (actual !== expected) {
      mismatches.push({ rel, reason: "hash-mismatch", expected, actual });
    }
  }

  if (mismatches.length > 0) {
    console.error("RELEASE_MANIFEST::VERIFY_FAIL");
    console.error(JSON.stringify({ mismatches }, null, 2));
    process.exit(1);
  }

  console.log("RELEASE_MANIFEST::VERIFY_PASS");
  console.log(
    JSON.stringify(
      {
        operator: manifest.operator,
        mshops_commit: manifest.mshops.commit_sha,
        artifacts_checked: Object.keys(manifest.artifact_hashes).length,
      },
      null,
      2,
    ),
  );
}

main();

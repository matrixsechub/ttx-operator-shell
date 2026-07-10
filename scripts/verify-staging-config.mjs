#!/usr/bin/env node

import { validateStagingKvConfig } from "./lib/stagingKvPlaceholders.mjs";

const result = validateStagingKvConfig();

if (result.ok) {
  console.log("Staging KV configuration OK — no placeholder IDs detected; staging bindings differ from production.");
  process.exit(0);
}

console.error("Staging KV configuration is not ready for deploy:\n");
for (const error of result.errors) {
  console.error(`  - ${error}`);
}
console.error("\nSee docs/RELEASE.md — Staging Provisioning Checklist.");
process.exit(1);

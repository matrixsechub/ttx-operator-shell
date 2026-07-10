#!/usr/bin/env node

import { execSync } from "node:child_process";
import { validateStagingKvConfig } from "./lib/stagingKvPlaceholders.mjs";

const result = validateStagingKvConfig();
if (!result.ok) {
  console.error("Aborting staging deploy — KV namespaces are not provisioned:\n");
  for (const error of result.errors) {
    console.error(`  - ${error}`);
  }
  console.error("\nProvision staging KV (see docs/RELEASE.md) and replace placeholder ids in wrangler.jsonc before deploying.");
  process.exit(1);
}

function run(command) {
  execSync(command, { stdio: "inherit", shell: true, env: process.env });
}

run("node scripts/build.mjs");
run("wrangler deploy --env staging");

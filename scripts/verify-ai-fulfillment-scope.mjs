#!/usr/bin/env node
/**
 * Back-compat entrypoint — delegates to scripts/ci/verify-ai-fulfillment-scope.mjs
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const script = join(dirname(fileURLToPath(import.meta.url)), "ci", "verify-ai-fulfillment-scope.mjs");
const result = spawnSync(process.execPath, [script, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);

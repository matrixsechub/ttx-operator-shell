#!/usr/bin/env node

import { execSync, spawnSync } from "node:child_process";
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

const commitSha =
  process.env.GIT_COMMIT_SHA?.trim() ||
  process.env.GITHUB_SHA?.trim() ||
  execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const buildTimestamp =
  process.env.BUILD_TIMESTAMP?.trim() || new Date().toISOString();

process.env.GIT_COMMIT_SHA = commitSha;
process.env.BUILD_COMMIT_SHA = commitSha;
process.env.BUILD_TIMESTAMP = buildTimestamp;

run("node scripts/build.mjs");

const deploy = spawnSync(
  "npx",
  [
    "wrangler",
    "deploy",
    "--env",
    "staging",
    "--var",
    `BUILD_COMMIT_SHA:${commitSha}`,
    "--var",
    `BUILD_TIMESTAMP:${buildTimestamp}`,
  ],
  { stdio: "inherit", env: process.env, shell: process.platform === "win32" },
);

if (deploy.status !== 0) {
  process.exit(deploy.status ?? 1);
}

console.log(
  JSON.stringify({
    commitSha,
    buildTimestamp,
    deployEnv: "staging",
  }),
);
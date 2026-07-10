#!/usr/bin/env node

import { execSync } from "node:child_process";

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
process.env.BUILD_TIMESTAMP = buildTimestamp;

run("node scripts/build.mjs");
run(
  `npx wrangler deploy --var BUILD_COMMIT_SHA:${commitSha} --var BUILD_TIMESTAMP:${buildTimestamp}`,
);

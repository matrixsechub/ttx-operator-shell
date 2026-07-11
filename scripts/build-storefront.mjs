#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FAILURE_CODES, resolveMshopsRoot } from "./lib/storefrontBundle.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mshopsRoot = resolveMshopsRoot(root);
const buildScript = join(mshopsRoot, "scripts", "build-pages-final.mjs");

if (!existsSync(mshopsRoot)) {
  console.error(`STOREFRONT_ASSEMBLY::FAIL`);
  console.error(`  code: ${FAILURE_CODES.SOURCE_MISSING}`);
  console.error(`  message: MSHOPS root not found at ${mshopsRoot}`);
  process.exit(1);
}

if (!existsSync(buildScript)) {
  console.error(`STOREFRONT_ASSEMBLY::FAIL`);
  console.error(`  code: ${FAILURE_CODES.SOURCE_MISSING}`);
  console.error(`  message: ${buildScript} not found`);
  process.exit(1);
}

try {
  if (existsSync(join(mshopsRoot, "package.json")) && !existsSync(join(mshopsRoot, "node_modules"))) {
    console.log("Installing MSHOPS dependencies...");
    execSync("npm ci", { stdio: "inherit", cwd: mshopsRoot, shell: true });
  }
  execSync(`node "${buildScript}"`, { stdio: "inherit", cwd: mshopsRoot, shell: true });
  console.log("STOREFRONT_BUILD::PASS");
} catch (error) {
  console.error("STOREFRONT_ASSEMBLY::FAIL");
  console.error(`  code: ${FAILURE_CODES.BUILD_FAILED}`);
  console.error(`  message: ${error instanceof Error ? error.message : "MSHOPS build failed"}`);
  process.exit(1);
}

#!/usr/bin/env node

import { execSync } from "node:child_process";
import { restoreViteShells, stageViteShells } from "./lib/viteShellStaging.mjs";

function run(command) {
  execSync(command, { stdio: "inherit", shell: true });
}

run("npm run cf-typegen");
run("npx tsc -b");
run("npx vite build");
stageViteShells();
run("node scripts/build-storefront.mjs");
run("node scripts/assemble-storefront-dist.mjs");
restoreViteShells();
run("node scripts/assemble-operator-dist.mjs");
run("node scripts/ci/verify-storefront-assembly.mjs");
run("node scripts/ci/verify-ecosystem-shell.mjs");

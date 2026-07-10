#!/usr/bin/env node

import { execSync } from "node:child_process";

function run(command) {
  execSync(command, { stdio: "inherit", shell: true });
}

run("npm run cf-typegen");
run("npx tsc -b --noEmit");

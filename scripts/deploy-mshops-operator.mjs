#!/usr/bin/env node
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const run = (command) => {
  console.log(`> ${command}`);
  execSync(command, { stdio: "inherit", shell: true, cwd: root });
};

run("npm run cf-typegen");
run("npx tsc -b");
run("npx vite build");
run("npx wrangler deploy -c wrangler.mshops-operator.jsonc");

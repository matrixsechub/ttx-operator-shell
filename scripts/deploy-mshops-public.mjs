#!/usr/bin/env node
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mshopsRoot = join(root, "..", "MSHOPS");

const run = (command, cwd = root) => {
  console.log(`> ${command}`);
  execSync(command, { stdio: "inherit", shell: true, cwd });
};

run("npm run cf-typegen");
run("npx tsc -b");
run("node scripts/build-pages-final.mjs", mshopsRoot);
run("npx vite build");
run("node scripts/assemble-public-dist.mjs");
run("npx wrangler deploy -c wrangler.mshops-public.jsonc");

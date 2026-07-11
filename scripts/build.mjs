#!/usr/bin/env node

import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

function run(command) {
  execSync(command, { stdio: "inherit", shell: true });
}

function mergeStorefrontDist() {
  const tmp = "dist-app-tmp";
  const target = join("dist", "app");
  const shell =
    existsSync(join(tmp, "index.html"))
      ? join(tmp, "index.html")
      : existsSync(join(tmp, "storefront.html"))
        ? join(tmp, "storefront.html")
        : null;
  const assets = join(tmp, "assets");

  if (!shell) {
    throw new Error("Storefront build missing dist-app-tmp/index.html — run vite storefront build first.");
  }

  mkdirSync(target, { recursive: true });
  cpSync(shell, join(target, "index.html"));
  if (existsSync(assets)) {
    cpSync(assets, join(target, "assets"), { recursive: true });
  }
  rmSync(tmp, { recursive: true, force: true });
}

run("npm run cf-typegen");
run("npx tsc -b");
run("npx vite build");
run("npx vite build --config vite.storefront.config.ts");
mergeStorefrontDist();
run("node scripts/assemble-operator-dist.mjs");

#!/usr/bin/env node
// Deploy guard: fail if the built storefront is the CI sample (or missing).
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { FIXTURE_MARKER } from "../lib/storefront-source.mjs";

export function checkStorefront(distDir) {
  const shell = join(distDir, "app", "index.html");
  if (!existsSync(shell)) {
    return { ok: false, error: `${shell} is missing` };
  }
  if (readFileSync(shell, "utf8").includes(FIXTURE_MARKER)) {
    return { ok: false, error: "dist/app is the CI sample storefront; refusing to deploy it" };
  }
  return { ok: true };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const result = checkStorefront(resolve(process.argv[2] ?? join(root, "dist")));
  if (!result.ok) {
    console.error(`STOREFRONT_GUARD::FAIL::${result.error}`);
    process.exit(1);
  }
  console.log("STOREFRONT_GUARD::PASS::real MSHOPS storefront");
}

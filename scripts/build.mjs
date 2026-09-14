#!/usr/bin/env node

import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function run(command, cwd = root) {
  execSync(command, { stdio: "inherit", shell: true, cwd });
}

/**
 * Option C launch fix: serve the MSHOPS Pearl OS storefront under /app/*
 * instead of the legacy TTX vite.storefront marketplace bundle.
 *
 * Resolution order (default / production):
 * 1. MSHOPS_BUILD_DIR (points at a build-final directory)
 * 2. Sibling checkout ../MSHOPS/build-final
 * 3. Shallow clone of matrixsechub/MSHOPS into .deps/MSHOPS (needs git auth for private repo)
 *
 * Staging / CI cockpit-only path:
 * Set SKIP_MSHOPS_STOREFRONT=1 to skip private clone + storefront merge.
 * Also auto-skips when GITHUB_WORKFLOW is exactly "Staging Deploy" so a
 * main-dispatched Staging Deploy that checks out this SHA still uses the
 * Cockpit-only artifact even if the caller workflow YAML omits the env flag.
 * Explicit MSHOPS_BUILD_DIR always wins (production artifact path).
 * Cockpit/Pearl shells (/chat, /settings, …) still build from this repo.
 * Storefront routes fail closed at runtime when /app/index.html is absent.
 * Production deploy must NOT set SKIP_MSHOPS_STOREFRONT and uses MSHOPS_BUILD_DIR.
 */
export const STAGING_DEPLOY_WORKFLOW_NAME = "Staging Deploy";

export function shouldSkipMshopsStorefront(env = process.env) {
  if (String(env.MSHOPS_BUILD_DIR ?? "").trim()) {
    return false;
  }
  if (String(env.SKIP_MSHOPS_STOREFRONT ?? "").trim() === "1") {
    return true;
  }
  // Caller workflow name is preserved inside reusable workflow jobs.
  return String(env.GITHUB_WORKFLOW ?? "").trim() === STAGING_DEPLOY_WORKFLOW_NAME;
}

function resolveMshopsBuildFinal() {
  const envDir = process.env.MSHOPS_BUILD_DIR?.trim();
  const candidates = [
    envDir,
    join(root, "..", "MSHOPS", "build-final"),
    join(root, ".deps", "MSHOPS", "build-final"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(join(candidate, "app", "index.html"))) {
      return candidate;
    }
  }

  const depsRepo = join(root, ".deps", "MSHOPS");
  mkdirSync(join(root, ".deps"), { recursive: true });
  if (existsSync(depsRepo)) {
    rmSync(depsRepo, { recursive: true, force: true });
  }

  const repoUrl =
    process.env.MSHOPS_REPO_URL?.trim() ||
    "https://github.com/matrixsechub/MSHOPS.git";
  console.log(`> cloning MSHOPS for storefront artifact (${repoUrl})`);
  run(`git clone --depth 1 ${repoUrl} "${depsRepo}"`);

  const cloned = join(depsRepo, "build-final");
  if (!existsSync(join(cloned, "app", "index.html"))) {
    throw new Error(
      "MSHOPS build-final/app/index.html missing after clone. Set MSHOPS_BUILD_DIR or ensure MSHOPS main has a committed Pages artifact.",
    );
  }
  return cloned;
}

export function mergeMshopsStorefront() {
  if (shouldSkipMshopsStorefront()) {
    console.warn(
      "> cockpit-only build — skipping private MSHOPS clone/merge (Pearl/cockpit only; storefront routes fail closed)",
    );
    return false;
  }

  const mshopsBuild = resolveMshopsBuildFinal();
  const sourceApp = join(mshopsBuild, "app");
  const target = join(root, "dist", "app");

  console.log(`> merging MSHOPS storefront from ${mshopsBuild}`);
  rmSync(target, { recursive: true, force: true });
  mkdirSync(join(root, "dist"), { recursive: true });
  cpSync(sourceApp, target, { recursive: true });

  if (!existsSync(join(target, "index.html"))) {
    throw new Error("MSHOPS storefront merge failed — dist/app/index.html missing");
  }
  return true;
}

function main() {
  run("npm run cf-typegen");
  run("npx tsc -b");
  run("npx vite build");
  mergeMshopsStorefront();
  run("node scripts/assemble-operator-dist.mjs");
}

const entry = process.argv[1] ? resolve(process.argv[1]) : "";
if (entry && entry === fileURLToPath(import.meta.url)) {
  main();
}

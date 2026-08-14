#!/usr/bin/env node

import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function run(command, cwd = root) {
  execSync(command, { stdio: "inherit", shell: true, cwd });
}

function assertNoMshopsTokenInActions() {
  if (process.env.GITHUB_ACTIONS !== "true") return;
  for (const key of ["GH_PAT", "MSHOPS_TOKEN", "MSHOPS_CHECKOUT_TOKEN"]) {
    if (process.env[key]?.trim()) {
      throw new Error(
        `${key} is visible during build under GitHub Actions. MSHOPS credentials must be clone-step-scoped only.`,
      );
    }
  }
}

/**
 * Resolve MSHOPS clone URL for local/non-Actions use.
 * Prefer explicit MSHOPS_REPO_URL; otherwise use GH_PAT / GITHUB_TOKEN.
 * Never log the token. GitHub Actions must not reach this path.
 */
function resolveMshopsRepoUrl() {
  const explicit = process.env.MSHOPS_REPO_URL?.trim();
  if (explicit) return explicit;

  const owner = process.env.GITHUB_REPOSITORY_OWNER?.trim() || "matrixsechub";
  const pat = process.env.GH_PAT?.trim() || process.env.GITHUB_TOKEN?.trim();
  if (pat) {
    return `https://x-access-token:${pat}@github.com/${owner}/MSHOPS.git`;
  }
  return `https://github.com/${owner}/MSHOPS.git`;
}

function redactRepoUrl(repoUrl) {
  return repoUrl.replace(/x-access-token:[^@]+@/i, "x-access-token:***@");
}

/**
 * Option C launch fix: serve the MSHOPS Pearl OS storefront under /app/*
 * instead of the legacy TTX vite.storefront marketplace bundle.
 *
 * Resolution order:
 * 1. MSHOPS_BUILD_DIR (points at a build-final directory)
 * 2. Sibling checkout ../MSHOPS/build-final
 * 3. Shallow clone of matrixsechub/MSHOPS into .deps/MSHOPS (local only; needs git auth)
 *
 * Fail-closed: if the real MSHOPS artifact is unavailable, the build fails.
 * Under GitHub Actions, cloning with GH_PAT from build scripts is forbidden —
 * CI must pre-clone via the dedicated step-scoped action and set MSHOPS_BUILD_DIR.
 */
function resolveMshopsBuildFinal() {
  assertNoMshopsTokenInActions();

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

  if (process.env.GITHUB_ACTIONS === "true") {
    throw new Error(
      "MSHOPS artifact unavailable in GitHub Actions (fail-closed). Pre-clone via .github/actions/checkout-mshops-artifact (step-scoped token) and set MSHOPS_BUILD_DIR. Build scripts must not receive GH_PAT.",
    );
  }

  const depsRepo = join(root, ".deps", "MSHOPS");
  mkdirSync(join(root, ".deps"), { recursive: true });
  if (existsSync(depsRepo)) {
    rmSync(depsRepo, { recursive: true, force: true });
  }

  const repoUrl = resolveMshopsRepoUrl();
  console.log(`> cloning MSHOPS for storefront artifact (${redactRepoUrl(repoUrl)})`);
  try {
    run(`git clone --depth 1 "${repoUrl}" "${depsRepo}"`);
  } catch {
    throw new Error(
      "MSHOPS clone failed (fail-closed). Set GH_PAT (or MSHOPS_REPO_URL / MSHOPS_BUILD_DIR) so the real storefront artifact is available.",
    );
  }

  const cloned = join(depsRepo, "build-final");
  if (!existsSync(join(cloned, "app", "index.html"))) {
    throw new Error(
      "MSHOPS build-final/app/index.html missing after clone (fail-closed). Set MSHOPS_BUILD_DIR or ensure MSHOPS main has a committed Pages artifact.",
    );
  }
  return cloned;
}

function mergeMshopsStorefront() {
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
}

assertNoMshopsTokenInActions();
run("npm run cf-typegen");
run("npx tsc -b");
run("npx vite build");
mergeMshopsStorefront();
run("node scripts/assemble-operator-dist.mjs");

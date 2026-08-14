#!/usr/bin/env node

import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function run(command, cwd = root) {
  execSync(command, { stdio: "inherit", shell: true, cwd });
}

function mshopsOptional() {
  return process.env.MSHOPS_OPTIONAL === "1" || process.env.MSHOPS_OPTIONAL === "true";
}

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

/**
 * Option C launch fix: serve the MSHOPS Pearl OS storefront under /app/*
 * instead of the legacy TTX vite.storefront marketplace bundle.
 *
 * Resolution order:
 * 1. MSHOPS_BUILD_DIR (points at a build-final directory)
 * 2. Sibling checkout ../MSHOPS/build-final
 * 3. Shallow clone of matrixsechub/MSHOPS into .deps/MSHOPS (needs git auth for private repo)
 *
 * Set MSHOPS_OPTIONAL=1 to skip the storefront merge when the artifact is
 * unavailable (CI dry-run / local without GH_PAT). Production deploy must not
 * set this — it clones with GH_PAT and requires dist/app.
 */
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

  const repoUrl = resolveMshopsRepoUrl();
  const redacted = repoUrl.replace(/x-access-token:[^@]+@/i, "x-access-token:***@");
  console.log(`> cloning MSHOPS for storefront artifact (${redacted})`);
  try {
    run(`git clone --depth 1 "${repoUrl}" "${depsRepo}"`);
  } catch (error) {
    if (mshopsOptional()) {
      console.warn(
        "> MSHOPS clone failed; MSHOPS_OPTIONAL=1 so continuing without storefront merge",
      );
      return null;
    }
    throw error;
  }

  const cloned = join(depsRepo, "build-final");
  if (!existsSync(join(cloned, "app", "index.html"))) {
    if (mshopsOptional()) {
      console.warn(
        "> MSHOPS build-final/app/index.html missing after clone; MSHOPS_OPTIONAL=1 so skipping merge",
      );
      return null;
    }
    throw new Error(
      "MSHOPS build-final/app/index.html missing after clone. Set MSHOPS_BUILD_DIR or ensure MSHOPS main has a committed Pages artifact.",
    );
  }
  return cloned;
}

function writeCiStorefrontStub() {
  const target = join(root, "dist", "app");
  mkdirSync(target, { recursive: true });
  // Minimal shell satisfying assemble-operator-dist storefront markers for CI dry-runs.
  writeFileSync(
    join(target, "index.html"),
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>MSH OPS Storefront</title>
  </head>
  <body>
    <div id="root"></div>
    <!-- /app/assets/ placeholder for CI when private MSHOPS artifact is unavailable -->
  </body>
</html>
`,
  );
  console.warn("> wrote CI storefront stub at dist/app/index.html");
}

function mergeMshopsStorefront() {
  const mshopsBuild = resolveMshopsBuildFinal();
  if (!mshopsBuild) {
    writeCiStorefrontStub();
    return;
  }

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

run("npm run cf-typegen");
run("npx tsc -b");
run("npx vite build");
mergeMshopsStorefront();
run("node scripts/assemble-operator-dist.mjs");

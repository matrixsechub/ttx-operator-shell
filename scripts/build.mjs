#!/usr/bin/env node

import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function run(command, cwd = root) {
  execSync(command, { stdio: "inherit", shell: true, cwd });
}

function tryGitHead(cwd) {
  try {
    return execSync("git rev-parse HEAD", { cwd, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
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
 * @returns {{ buildFinal: string, commitSha: string }}
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
      const repoRoot = join(candidate, "..");
      const commitSha =
        process.env.MSHOPS_COMMIT_SHA?.trim() ||
        tryGitHead(repoRoot) ||
        tryGitHead(candidate) ||
        "unavailable";
      return { buildFinal: candidate, commitSha };
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
  const commitSha =
    process.env.MSHOPS_COMMIT_SHA?.trim() || tryGitHead(depsRepo) || "unavailable";
  return { buildFinal: cloned, commitSha };
}

function mergeMshopsStorefront() {
  const { buildFinal: mshopsBuild, commitSha } = resolveMshopsBuildFinal();
  process.env.MSHOPS_COMMIT_SHA = commitSha;
  const sourceApp = join(mshopsBuild, "app");
  const target = join(root, "dist", "app");

  console.log(`> merging MSHOPS storefront from ${mshopsBuild} (sha=${commitSha})`);
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
run("node scripts/generate-release-manifest.mjs");

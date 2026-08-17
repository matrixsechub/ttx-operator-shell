#!/usr/bin/env node

/**
 * Generate an immutable release manifest at build time.
 * Writes dist/release-manifest.json and (when writable) repo-root release-manifest.json.
 */

import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

function resolveCommitSha() {
  if (process.env.GIT_COMMIT_SHA?.trim()) return process.env.GIT_COMMIT_SHA.trim();
  if (process.env.GITHUB_SHA?.trim()) return process.env.GITHUB_SHA.trim();
  try {
    return execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function resolveMshopsCommitSha() {
  if (process.env.MSHOPS_COMMIT_SHA?.trim()) return process.env.MSHOPS_COMMIT_SHA.trim();
  const candidates = [
    process.env.MSHOPS_BUILD_DIR?.trim(),
    join(root, "..", "MSHOPS", "build-final"),
    join(root, ".deps", "MSHOPS", "build-final"),
  ].filter(Boolean);

  for (const buildFinal of candidates) {
    const repoRoot = join(buildFinal, "..");
    if (!existsSync(join(repoRoot, ".git")) && !existsSync(join(repoRoot, "build-final"))) {
      continue;
    }
    try {
      return execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
    } catch {
      // try parent if build-final is the cwd root
    }
    try {
      return execSync("git rev-parse HEAD", {
        cwd: join(buildFinal, ".."),
        encoding: "utf8",
      }).trim();
    } catch {
      // continue
    }
  }
  return "unavailable";
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function walkFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkFiles(full, acc);
      continue;
    }
    // Omit sourcemaps and the manifest itself from the hash inventory.
    if (entry.endsWith(".map") || entry === "release-manifest.json") continue;
    acc.push(full);
  }
  return acc;
}

function hashTree(baseDir) {
  const files = walkFiles(baseDir);
  const hashes = {};
  for (const file of files.sort()) {
    const rel = relative(baseDir, file).replace(/\\/g, "/");
    hashes[rel] = sha256File(file);
  }
  return hashes;
}

function main() {
  if (!existsSync(dist)) {
    throw new Error(`dist/ missing at ${dist}. Run vite build + assemble first.`);
  }

  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const operatorCommitSha = resolveCommitSha();
  const mshopsCommitSha = resolveMshopsCommitSha();
  const buildTimestamp = process.env.BUILD_TIMESTAMP?.trim() || new Date().toISOString();
  const distHashes = hashTree(dist);

  const artifactPaths = [
    "index.html",
    "ecosystem-shell.html",
    "operator-shell.html",
    "auth-shell.html",
    "council-shell.html",
    "app/index.html",
    ".build-manifest.json",
  ];
  const artifactHashes = {};
  for (const rel of artifactPaths) {
    const full = join(dist, rel);
    if (existsSync(full)) artifactHashes[rel] = sha256File(full);
  }

  const manifest = {
    schema_version: "1.0",
    kind: "ttx-operator-shell-release-manifest",
    generated_at: new Date().toISOString(),
    build_timestamp: buildTimestamp,
    operator: {
      name: pkg.name,
      version: pkg.version,
      repository: process.env.GITHUB_REPOSITORY ?? "matrixsechub/ttx-operator-shell",
      commit_sha: operatorCommitSha,
    },
    mshops: {
      commit_sha: mshopsCommitSha,
      artifact_root: "dist/app",
    },
    artifact_hashes: artifactHashes,
    dist_hashes: distHashes,
    verification: {
      algorithm: "sha256",
      note: "Recompute sha256 over dist/ paths and compare to dist_hashes / artifact_hashes.",
    },
  };

  const json = `${JSON.stringify(manifest, null, 2)}\n`;
  writeFileSync(join(dist, "release-manifest.json"), json);

  // Committed, verifiable copy at repo root (Operator-reviewed release evidence).
  const committedPath = join(root, "release-manifest.json");
  writeFileSync(committedPath, json);

  // Also keep a copy under docs/evidence for audit trails that prefer that tree.
  const evidenceDir = join(root, "docs", "evidence");
  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(join(evidenceDir, "release-manifest.json"), json);

  console.log("RELEASE_MANIFEST::WRITTEN");
  console.log(
    JSON.stringify(
      {
        operator_commit: operatorCommitSha,
        mshops_commit: mshopsCommitSha,
        artifact_count: Object.keys(artifactHashes).length,
        dist_file_count: Object.keys(distHashes).length,
        paths: ["dist/release-manifest.json", "release-manifest.json", "docs/evidence/release-manifest.json"],
      },
      null,
      2,
    ),
  );
}

main();

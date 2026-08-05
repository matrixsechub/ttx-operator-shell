#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const PROHIBITED_TRACKED_ROOTS = [".worktrees/"];

export function parseGitmodules(text) {
  const entries = [];
  let current = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith(";")) continue;
    const section = line.match(/^\[submodule\s+"(.+)"\]$/);
    if (section) {
      current = { name: section[1], path: null, url: null };
      entries.push(current);
      continue;
    }
    if (!current) continue;
    const kv = line.match(/^(path|url)\s*=\s*(.+)$/);
    if (!kv) continue;
    current[kv[1]] = kv[2].trim();
  }
  return entries;
}

export function listGitlinksFromLsTree(lsTreeOutput) {
  const gitlinks = [];
  for (const line of lsTreeOutput.split(/\r?\n/)) {
    if (!line.trim()) continue;
    // 160000 commit <oid>\t<path>
    const match = line.match(/^160000\s+commit\s+([0-9a-f]{40})\t(.+)$/);
    if (!match) continue;
    gitlinks.push({ oid: match[1], path: match[2] });
  }
  return gitlinks;
}

export function verifyGitlinkIntegrity({
  gitlinks,
  gitmodulesText = null,
  gitmodulesExists = false,
} = {}) {
  const errors = [];

  if (!gitmodulesExists) {
    if (gitlinks.length > 0) {
      for (const gl of gitlinks) {
        errors.push(`orphan gitlink without .gitmodules: ${gl.path}`);
      }
    }
  } else {
    const modules = parseGitmodules(gitmodulesText ?? "");
    const byPath = new Map();
    for (const mod of modules) {
      if (!mod.path) {
        errors.push(`submodule "${mod.name}" missing path`);
        continue;
      }
      if (!mod.url) {
        errors.push(`submodule path "${mod.path}" missing url`);
      }
      if (byPath.has(mod.path)) {
        errors.push(`duplicate .gitmodules path: ${mod.path}`);
      }
      byPath.set(mod.path, mod);
    }

    const gitlinkPaths = new Set(gitlinks.map((g) => g.path));
    for (const gl of gitlinks) {
      if (!byPath.has(gl.path)) {
        errors.push(`orphan gitlink without .gitmodules: ${gl.path}`);
      }
    }
    for (const path of byPath.keys()) {
      if (!gitlinkPaths.has(path)) {
        errors.push(`.gitmodules path without mode-160000 gitlink: ${path}`);
      }
    }
  }

  for (const gl of gitlinks) {
    for (const root of PROHIBITED_TRACKED_ROOTS) {
      if (gl.path === root.slice(0, -1) || gl.path.startsWith(root)) {
        errors.push(`prohibited tracked worktree gitlink: ${gl.path}`);
      }
    }
  }

  return { ok: errors.length === 0, errors, gitlinkCount: gitlinks.length };
}

export function inspectRepositoryGitlinks(root = process.cwd()) {
  const lsTree = execFileSync(
    "git",
    ["ls-tree", "-r", "HEAD"],
    { cwd: root, encoding: "utf8" },
  );
  const gitlinks = listGitlinksFromLsTree(lsTree);
  const gitmodulesPath = join(root, ".gitmodules");
  const gitmodulesExists = existsSync(gitmodulesPath);
  const gitmodulesText = gitmodulesExists
    ? readFileSync(gitmodulesPath, "utf8")
    : null;
  return verifyGitlinkIntegrity({ gitlinks, gitmodulesText, gitmodulesExists });
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
const modulePath = resolve(fileURLToPath(import.meta.url));

if (invokedPath === modulePath) {
  const result = inspectRepositoryGitlinks();
  if (!result.ok) {
    console.error("GITLINK_INTEGRITY::FAIL");
    for (const error of result.errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  console.log(`GITLINK_INTEGRITY::PASS gitlinks=${result.gitlinkCount}`);
}

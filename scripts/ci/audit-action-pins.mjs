#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const repoRoot = process.cwd();

const TEMPORARY_ALLOWLIST = new Map();

const MUTABLE_TAG_PATTERN = /@(?:main|master|latest|v\d+)\s*$/i;

// Known SHAs that belong to a different action repo than the one named on the line.
const KNOWN_CROSS_REPO_SHA_MISMATCHES = new Map([
  [
    "ea165f8d65b6e75b540449e92b4886f43607fa02",
    "actions/upload-artifact (must not be used as actions/download-artifact)",
  ],
]);

function walkYamlFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === "node_modules") continue;
    const stat = statSyncSafe(full);
    if (!stat) continue;
    if (stat.isDirectory()) {
      walkYamlFiles(full, acc);
      continue;
    }
    if (entry.endsWith(".yml") || entry.endsWith(".yaml")) acc.push(full);
  }
  return acc;
}

function statSyncSafe(path) {
  try {
    return statSync(path);
  } catch {
    return null;
  }
}

function collectYamlFiles() {
  const files = [];
  const workflows = join(repoRoot, ".github", "workflows");
  const actions = join(repoRoot, ".github", "actions");
  walkYamlFiles(workflows, files);
  try {
    walkYamlFiles(actions, files);
  } catch {
    // actions directory may not exist yet during partial setup
  }
  return files;
}

function isFullSha(ref) {
  return /^[0-9a-f]{40}$/i.test(ref);
}

function auditUsesLine(filePath, line) {
  const match = line.match(/^\s*-\s*uses:\s*(.+?)\s*$/);
  if (!match) return null;

  let reference = match[1].trim();
  const commentIdx = reference.indexOf("#");
  if (commentIdx >= 0) reference = reference.slice(0, commentIdx).trim();
  if (reference.startsWith("./") || reference.startsWith(".github/")) {
    return { ok: true, reference };
  }

  const allowKey = `${relative(repoRoot, filePath)}::${reference}`;
  if (TEMPORARY_ALLOWLIST.has(allowKey)) {
    return { ok: true, reference };
  }

  const at = reference.lastIndexOf("@");
  if (at < 0) {
    return { ok: false, reference, reason: "missing @ ref" };
  }

  const actionName = reference.slice(0, at);
  const ref = reference.slice(at + 1);
  if (MUTABLE_TAG_PATTERN.test(`@${ref}`)) {
    return { ok: false, reference, reason: "mutable action tag" };
  }

  if (!isFullSha(ref)) {
    return { ok: false, reference, reason: "not a full commit SHA" };
  }

  const crossRepo = KNOWN_CROSS_REPO_SHA_MISMATCHES.get(ref.toLowerCase());
  if (crossRepo && actionName === "actions/download-artifact") {
    return {
      ok: false,
      reference,
      reason: `SHA belongs to ${crossRepo}`,
    };
  }

  return { ok: true, reference };
}

function auditFile(filePath) {
  const rel = relative(repoRoot, filePath).replace(/\\/g, "/");
  const lines = readFileSync(filePath, "utf8").split("\n");
  const results = [];

  for (const line of lines) {
    const audited = auditUsesLine(filePath, line);
    if (!audited) continue;
    results.push({ rel, ...audited });
  }

  return results;
}

function main() {
  const files = collectYamlFiles();
  let failed = false;

  for (const filePath of files) {
    for (const result of auditFile(filePath)) {
      if (result.ok) {
        console.log(`ACTION_PIN::PASS::${result.rel}::${result.reference}`);
      } else {
        console.log(`ACTION_PIN::FAIL::${result.rel}::${result.reference}`);
        failed = true;
      }
    }
  }

  if (failed) process.exit(1);
}

main();

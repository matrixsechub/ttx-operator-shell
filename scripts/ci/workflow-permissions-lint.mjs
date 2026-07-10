#!/usr/bin/env node

import { execSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const repoRoot = process.cwd();
const workflowsDir = join(repoRoot, ".github", "workflows");

const ALLOWED_WRITE_SCOPES = new Set([
  "actions: write",
  "contents: write",
  "pull-requests: write",
  "issues: write",
  "packages: write",
  "security-events: write",
  "id-token: write",
  "deployments: write",
]);

const DOCUMENTED_WRITE_ALLOWLIST = new Map([
  ["organizer-schedule.yml", new Set(["actions: write"])],
  ["_reusable-build-test.yml", new Set(["actions: write"])],
  ["_reusable-wrangler-dry-run.yml", new Set(["actions: write"])],
  ["ci.yml", new Set(["actions: write"])],
  ["staging-deploy.yml", new Set(["actions: write"])],
  ["security-pr.yml", new Set()],
]);

const SENSITIVE_PATH_PREFIXES = [
  ".github/workflows/",
  ".github/actions/",
  "wrangler.jsonc",
  "wrangler.",
  "worker/auth.ts",
  "worker/apiAuth.ts",
  "worker/edge/",
  "scripts/deploy",
  "scripts/verify",
  "msh-ops/beacon/",
];

function listWorkflowFiles() {
  return readdirSync(workflowsDir)
    .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
    .map((name) => join(workflowsDir, name));
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function stripComments(text) {
  return text
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("#");
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join("\n");
}

function extractTopLevelBlock(text, key) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => new RegExp(`^${key}:\\s*$`).test(line));
  if (start < 0) return null;

  const block = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\S/.test(line)) break;
    if (/^\s{0,1}\S/.test(line) && !/^\s{2,}/.test(line)) break;
    block.push(line);
  }
  return block.join("\n");
}

function parsePermissionEntries(permissionsBlock) {
  if (!permissionsBlock) return [];
  const entries = [];
  const inline = permissionsBlock.match(/permissions:\s*(\S+)/);
  if (inline) {
    entries.push(inline[1]);
    return entries;
  }
  for (const line of permissionsBlock.split("\n")) {
    const match = line.match(/^\s{2,}(\w[\w-]*):\s*(\S+)/);
    if (match) entries.push(`${match[1]}: ${match[2]}`);
  }
  return entries;
}

function lintWorkflowFile(filePath) {
  const rel = relative(repoRoot, filePath).replace(/\\/g, "/");
  const fileName = rel.split("/").pop() ?? rel;
  const raw = readText(filePath);
  const text = stripComments(raw);

  const permissionsBlock = extractTopLevelBlock(text, "permissions");
  if (!permissionsBlock && !/permissions:\s*\S+/.test(text)) {
    return { ok: false, reason: "missing top-level permissions block" };
  }

  const combinedPermissions = permissionsBlock ?? "";
  if (/write-all/i.test(combinedPermissions)) {
    return { ok: false, reason: "forbidden write-all permission" };
  }

  const entries = parsePermissionEntries(
    combinedPermissions || (text.match(/permissions:\s*(\S+)/) ? `permissions: ${RegExp.$1}` : ""),
  );

  const allowedWrites = DOCUMENTED_WRITE_ALLOWLIST.get(fileName) ?? new Set();
  for (const entry of entries) {
    if (!entry.endsWith(": write")) continue;
    if (!ALLOWED_WRITE_SCOPES.has(entry)) {
      return { ok: false, reason: `unknown write permission ${entry}` };
    }
    if (!allowedWrites.has(entry)) {
      return { ok: false, reason: `undocumented write permission ${entry}` };
    }
  }

  return { ok: true };
}

function advisorySensitivePaths(baseSha) {
  if (!baseSha?.trim()) {
    console.log("WORKFLOW_PERMISSIONS::ADVISORY::skip::missing base sha");
    return;
  }
  let changed = "";
  try {
    changed = execSync(`git diff --name-only ${baseSha} HEAD`, {
      encoding: "utf8",
      cwd: repoRoot,
    });
  } catch {
    console.log("WORKFLOW_PERMISSIONS::ADVISORY::skip::git diff failed");
    return;
  }

  const files = changed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const file of files) {
    const hit = SENSITIVE_PATH_PREFIXES.some((prefix) => file.startsWith(prefix) || file === prefix.replace(/\/$/, ""));
    if (hit) {
      console.log(`WORKFLOW_PERMISSIONS::ADVISORY::sensitive-path::${file}`);
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  const advisoryIdx = args.indexOf("--advisory");
  if (advisoryIdx >= 0) {
    advisorySensitivePaths(args[advisoryIdx + 1]);
    return;
  }

  let failed = false;
  for (const filePath of listWorkflowFiles()) {
    const rel = relative(repoRoot, filePath).replace(/\\/g, "/");
    const result = lintWorkflowFile(filePath);
    if (result.ok) {
      console.log(`WORKFLOW_PERMISSIONS::PASS::${rel}`);
    } else {
      console.log(`WORKFLOW_PERMISSIONS::FAIL::${rel}::${result.reason}`);
      failed = true;
    }
  }

  if (failed) process.exit(1);
}

main();

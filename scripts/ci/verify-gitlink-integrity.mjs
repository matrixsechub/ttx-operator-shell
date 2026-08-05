#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const PROHIBITED_TRACKED_ROOTS = [".worktrees/"];
const MAX_DIAGNOSTIC_STDERR_CHARS = 800;

/**
 * Map a Git storage object-format name to the expected OID hex length.
 * Fail-closed: only sha1 (40) and sha256 (64) are supported.
 * @param {string} format
 * @returns {number}
 */
export function oidLengthForFormat(format) {
  const normalized = String(format ?? "").trim().toLowerCase();
  if (normalized === "sha1") return 40;
  if (normalized === "sha256") return 64;
  throw new Error(
    `GITLINK_INTEGRITY::FAIL unsupported object format '${normalized || "<empty>"}' (supported: sha1, sha256)`,
  );
}

/**
 * @param {string} root
 * @returns {string}
 */
export function resolveObjectFormat(root = process.cwd()) {
  try {
    const out = execFileSync(
      "git",
      ["rev-parse", "--show-object-format=storage"],
      { cwd: root, encoding: "utf8" },
    );
    return String(out).trim();
  } catch (error) {
    throw wrapGitCommandError({
      operation: "git rev-parse --show-object-format=storage",
      revision: null,
      root,
      error,
    });
  }
}

/**
 * Sanitize stderr/stdout snippets for CI logs: strip controls, collapse
 * whitespace, truncate. Never include environment or secrets.
 * @param {unknown} value
 * @returns {string}
 */
export function sanitizeDiagnosticText(value) {
  if (value == null) return "";
  let text = typeof value === "string" ? value : String(value);
  text = text.replace(/[\u0000-\u001f\u007f]/g, " ");
  text = text.replace(/\s+/g, " ").trim();
  if (text.length > MAX_DIAGNOSTIC_STDERR_CHARS) {
    text = `${text.slice(0, MAX_DIAGNOSTIC_STDERR_CHARS)}…`;
  }
  return text;
}

/**
 * @param {{ operation: string, revision: string | null, root: string, error: unknown }} args
 * @returns {Error}
 */
export function wrapGitCommandError({ operation, revision, root, error }) {
  const anyError = /** @type {any} */ (error);
  const status =
    typeof anyError?.status === "number"
      ? anyError.status
      : typeof anyError?.code === "number"
        ? anyError.code
        : "unknown";
  const stderr = sanitizeDiagnosticText(
    anyError?.stderr ?? anyError?.message ?? "",
  );
  const parts = [
    "GITLINK_INTEGRITY::FAIL",
    `unable to run '${operation}'`,
    `in '${root}'`,
  ];
  if (revision) parts.push(`revision='${revision}'`);
  parts.push(`exit=${status}`);
  if (stderr) parts.push(`stderr=${stderr}`);
  const wrapped = new Error(parts.join(" "));
  if (error instanceof Error) {
    wrapped.cause = error;
  }
  return wrapped;
}

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

/**
 * Parse mode-160000 commit gitlinks from `git ls-tree` output.
 * OID length must match the repository object format (sha1=40, sha256=64).
 * Wrong-length / non-hex OIDs are not accepted (fail-closed: skipped).
 * @param {string} lsTreeOutput
 * @param {{ oidLength?: number }} [options]
 */
export function listGitlinksFromLsTree(lsTreeOutput, { oidLength = 40 } = {}) {
  if (oidLength !== 40 && oidLength !== 64) {
    throw new Error(
      `GITLINK_INTEGRITY::FAIL invalid oidLength ${oidLength} (expected 40 or 64)`,
    );
  }
  const gitlinks = [];
  const pattern = new RegExp(
    `^160000\\s+commit\\s+([0-9a-f]{${oidLength}})\\t(.+)$`,
  );
  for (const line of lsTreeOutput.split(/\r?\n/)) {
    if (!line.trim()) continue;
    // 160000 commit <oid>\t<path>
    const match = line.match(pattern);
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
  const objectFormat = resolveObjectFormat(root);
  const oidLength = oidLengthForFormat(objectFormat);

  let lsTree;
  try {
    lsTree = execFileSync("git", ["ls-tree", "-r", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    });
  } catch (error) {
    throw wrapGitCommandError({
      operation: "git ls-tree -r HEAD",
      revision: "HEAD",
      root,
      error,
    });
  }

  const gitlinks = listGitlinksFromLsTree(lsTree, { oidLength });
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
  try {
    const result = inspectRepositoryGitlinks();
    if (!result.ok) {
      console.error("GITLINK_INTEGRITY::FAIL");
      for (const error of result.errors) console.error(`  - ${error}`);
      process.exit(1);
    }
    console.log(`GITLINK_INTEGRITY::PASS gitlinks=${result.gitlinkCount}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.startsWith("GITLINK_INTEGRITY::FAIL")) {
      console.error(`GITLINK_INTEGRITY::FAIL ${message}`);
    } else {
      console.error(message);
    }
    process.exit(1);
  }
}

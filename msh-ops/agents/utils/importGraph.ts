import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type { DeadExportCandidate, FileMetadata, ImportCycle } from "../types.ts";
import { normalizePath } from "./fileScanner.ts";

const IMPORT_RE =
  /(?:import\s+(?:type\s+)?(?:[^"'\n]+from\s+)?|export\s+(?:type\s+)?(?:\{[^}]*\}|\*)\s+from\s+)["']([^"']+)["']/g;

const EXPORT_RE = /export\s+(?:async\s+)?(?:function|const|class|enum)\s+(\w+)/g;

const ENTRYPOINT_PATTERNS = [
  /^src\/entries\//,
  /^worker\/index\.ts$/,
  /-main\.tsx$/,
  /^msh-ops\/agents\/runOrganizer\.ts$/,
];

function resolveImport(
  fromFile: string,
  specifier: string,
  repoRoot: string,
  knownFiles: Set<string>,
): string | null {
  if (!specifier.startsWith(".")) return null;

  const fromDir = dirname(fromFile);
  const base = normalizePath(join(fromDir, specifier));

  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
  ];

  for (const candidate of candidates) {
    if (knownFiles.has(candidate)) return candidate;
    try {
      readFileSync(join(repoRoot, candidate), "utf8");
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
}

function isEntrypoint(relativePath: string): boolean {
  return ENTRYPOINT_PATTERNS.some((p) => p.test(relativePath));
}

function isTestFile(relativePath: string): boolean {
  return relativePath.startsWith("tests/") || relativePath.includes(".test.");
}

export function parseImports(content: string): string[] {
  const specifiers: string[] = [];
  for (const match of content.matchAll(IMPORT_RE)) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

export function parseExports(content: string): string[] {
  const names: string[] = [];
  for (const match of content.matchAll(EXPORT_RE)) {
    names.push(match[1]);
  }
  return names;
}

export function buildImportGraph(
  repoRoot: string,
  files: FileMetadata[],
): { adjacency: Map<string, string[]>; knownFiles: Set<string> } {
  const knownFiles = new Set(files.map((f) => f.relativePath));
  const adjacency = new Map<string, string[]>();

  for (const file of files) {
    if (!/\.(ts|tsx)$/.test(file.relativePath)) continue;

    let content: string;
    try {
      content = readFileSync(join(repoRoot, file.relativePath), "utf8");
    } catch {
      continue;
    }

    const deps: string[] = [];
    for (const specifier of parseImports(content)) {
      const resolved = resolveImport(file.relativePath, specifier, repoRoot, knownFiles);
      if (resolved) deps.push(resolved);
    }
    adjacency.set(file.relativePath, deps);
  }

  return { adjacency, knownFiles };
}

export function detectCircularImports(adjacency: Map<string, string[]>): ImportCycle[] {
  const cycles: ImportCycle[] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): void {
    if (stack.has(node)) {
      const cycleStart = path.indexOf(node);
      if (cycleStart >= 0) {
        cycles.push({ chain: [...path.slice(cycleStart), node] });
      }
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    stack.add(node);
    path.push(node);

    for (const dep of adjacency.get(node) ?? []) {
      dfs(dep);
    }

    path.pop();
    stack.delete(node);
  }

  for (const node of adjacency.keys()) {
    dfs(node);
  }

  const seen = new Set<string>();
  return cycles.filter((c) => {
    const key = c.chain.join("->");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function detectDeadExports(
  repoRoot: string,
  files: FileMetadata[],
  adjacency: Map<string, string[]>,
): DeadExportCandidate[] {
  const importers = new Map<string, Set<string>>();
  for (const [from, deps] of adjacency) {
    for (const dep of deps) {
      if (!importers.has(dep)) importers.set(dep, new Set());
      importers.get(dep)!.add(from);
    }
  }

  const dead: DeadExportCandidate[] = [];

  for (const file of files) {
    if (!/\.(ts|tsx)$/.test(file.relativePath)) continue;
    if (isEntrypoint(file.relativePath) || isTestFile(file.relativePath)) continue;

    const inbound = importers.get(file.relativePath);
    if (inbound && inbound.size > 0) continue;

    let content: string;
    try {
      content = readFileSync(join(repoRoot, file.relativePath), "utf8");
    } catch {
      continue;
    }

    const exports = parseExports(content);
    if (exports.length === 0) continue;

    dead.push({ relativePath: file.relativePath, exportNames: exports });
  }

  return dead;
}

export function analyzeImports(
  repoRoot: string,
  files: FileMetadata[],
): { cycles: ImportCycle[]; deadExports: DeadExportCandidate[] } {
  const { adjacency } = buildImportGraph(repoRoot, files);
  return {
    cycles: detectCircularImports(adjacency),
    deadExports: detectDeadExports(repoRoot, files, adjacency),
  };
}

export function rewriteImportSpecifier(
  fromFile: string,
  oldTarget: string,
  newTarget: string,
  specifier: string,
): string | null {
  if (!specifier.startsWith(".")) return null;

  const fromDir = dirname(fromFile);
  const resolved = normalizePath(join(fromDir, specifier));

  if (stripModulePath(resolved) !== stripModulePath(oldTarget)) return null;

  const newBase = newTarget.replace(/\.tsx?$/, "");
  let rel = normalizePath(relative(fromDir, newBase));
  if (!rel.startsWith(".")) rel = `./${rel}`;

  if (specifier.endsWith(".ts") && !rel.endsWith(".ts")) rel += ".ts";
  if (specifier.endsWith(".tsx") && !rel.endsWith(".tsx")) rel += ".tsx";

  return rel;
}

function stripModulePath(p: string): string {
  return p.replace(/\.tsx?$/, "").replace(/\/index$/, "");
}

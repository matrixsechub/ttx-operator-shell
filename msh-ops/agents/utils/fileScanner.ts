import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { FileMetadata, RepoLayer, ScanAnomaly, ScanResult } from "../types.ts";
import { IGNORE_SEGMENTS, SCAN_ROOTS } from "../types.ts";

const TTX_LOWERCASE_VIEWS = new Set([
  "builder.tsx",
  "timeline.tsx",
  "injects.tsx",
  "score.tsx",
  "roles.tsx",
  "packs.tsx",
]);

function normalizePath(p: string): string {
  return p.split(sep).join("/");
}

function detectLayer(relativePath: string): RepoLayer {
  if (relativePath.startsWith("src/")) return "src";
  if (relativePath.startsWith("worker/")) return "worker";
  if (relativePath.startsWith("msh-ops/")) return "msh-ops";
  if (relativePath.startsWith("scripts/")) return "scripts";
  if (relativePath.startsWith("tests/")) return "tests";
  return "other";
}

function shouldIgnore(relativePath: string): boolean {
  const segments = relativePath.split("/");
  if (segments.some((s) => (IGNORE_SEGMENTS as readonly string[]).includes(s))) {
    return true;
  }
  if (relativePath.endsWith(".tsbuildinfo")) return true;
  if (relativePath === "worker-configuration.d.ts") return true;
  if (/^worker\/data\/.*\.js$/.test(relativePath)) return true;
  if (/^data\/.*\.js$/.test(relativePath)) return true;
  if (relativePath.includes("tests/msh-ops/organizer/fixtures/")) return true;
  return false;
}

function walkDir(absDir: string, repoRoot: string, files: FileMetadata[]): void {
  let entries: string[];
  try {
    entries = readdirSync(absDir);
  } catch {
    return;
  }

  for (const entry of entries) {
    const absPath = join(absDir, entry);
    const relPath = normalizePath(relative(repoRoot, absPath));
    if (shouldIgnore(relPath)) continue;

    let stat;
    try {
      stat = statSync(absPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      walkDir(absPath, repoRoot, files);
      continue;
    }

    if (!stat.isFile()) continue;

    const ext = entry.includes(".") ? `.${entry.split(".").pop()}` : "";
    files.push({
      relativePath: relPath,
      extension: ext,
      sizeBytes: stat.size,
      layer: detectLayer(relPath),
    });
  }
}

function collectRootFiles(repoRoot: string, files: FileMetadata[]): void {
  const rootPatterns = [/^[^/]+\.html$/, /^wrangler.*\.jsonc$/, /^package\.json$/];
  let entries: string[];
  try {
    entries = readdirSync(repoRoot);
  } catch {
    return;
  }

  for (const entry of entries) {
    const relPath = entry;
    if (!rootPatterns.some((p) => p.test(relPath))) continue;
    const absPath = join(repoRoot, entry);
    try {
      const stat = statSync(absPath);
      if (!stat.isFile()) continue;
      const ext = entry.includes(".") ? `.${entry.split(".").pop()}` : "";
      files.push({
        relativePath: relPath,
        extension: ext,
        sizeBytes: stat.size,
        layer: "other",
      });
    } catch {
      continue;
    }
  }
}

function detectAnomalies(repoRoot: string, files: FileMetadata[]): ScanAnomaly[] {
  const anomalies: ScanAnomaly[] = [];
  const pathSet = new Set(files.map((f) => f.relativePath));

  for (const file of files) {
    if (/^data\/.*\.(js|ts)$/.test(file.relativePath) && !file.relativePath.startsWith("worker/")) {
      anomalies.push({
        kind: "duplicate-data-root",
        relativePath: file.relativePath,
        message: "File in root data/ may duplicate worker/data/ — consider consolidating",
        severity: "warn",
      });
    }

    if (/^worker\/data\/.*\.js$/.test(file.relativePath)) {
      anomalies.push({
        kind: "stale-js-artifact",
        relativePath: file.relativePath,
        message: "Compiled .js artifact alongside TypeScript in worker/data/",
        severity: "warn",
      });
    }

    if (
      file.extension === ".tsx" &&
      file.relativePath.startsWith("src/") &&
      !file.relativePath.includes("/operator/ttx/")
    ) {
      const basename = file.relativePath.split("/").pop() ?? "";
      if (!/^[A-Z][A-Za-z0-9]*\.tsx$/.test(basename) && !TTX_LOWERCASE_VIEWS.has(basename)) {
        anomalies.push({
          kind: "naming-component",
          relativePath: file.relativePath,
          message: "React component file should use PascalCase.tsx",
          severity: "warn",
        });
      }
    }

    if (file.relativePath.startsWith("src/lib/") && file.extension === ".ts") {
      const basename = file.relativePath.split("/").pop() ?? "";
      const allowed =
        /Service\.ts$/.test(basename) ||
        /^use[A-Z].*\.ts$/.test(basename) ||
        /Types?\.ts$/.test(basename) ||
        /^(apiClient|authToken|ecosystem|RequireAuth|AuthContext)\.ts$/.test(basename) ||
        /^liveTtxProtocol\.ts$/.test(basename);
      if (!allowed) {
        anomalies.push({
          kind: "naming-service",
          relativePath: file.relativePath,
          message: "src/lib file does not match service/hook/types naming convention",
          severity: "info",
        });
      }
    }
  }

  for (const file of files) {
    if (!/\.(ts|tsx)$/.test(file.relativePath)) continue;
    let content: string;
    try {
      content = readFileSync(join(repoRoot, file.relativePath), "utf8");
    } catch {
      continue;
    }

    const importMatches = content.matchAll(/from\s+["']([^"']+)["']/g);
    for (const match of importMatches) {
      const specifier = match[1];
      if (specifier.startsWith("worker/") || specifier.startsWith("../worker/") || specifier.includes("/worker/")) {
        if (file.layer === "src") {
          anomalies.push({
            kind: "cross-layer-import",
            relativePath: file.relativePath,
            message: `src file imports worker module: ${specifier}`,
            severity: "error",
          });
        }
      }
      if (specifier.startsWith("msh-ops/") || specifier.includes("/msh-ops/")) {
        if (file.layer === "src") {
          anomalies.push({
            kind: "cross-layer-import",
            relativePath: file.relativePath,
            message: `src file imports msh-ops module: ${specifier}`,
            severity: "error",
          });
        }
      }
    }
  }

  if (pathSet.has("data/aiAgentBuilderAgent.js") && pathSet.has("worker/data/aiAgentBuilderAgent.ts")) {
    anomalies.push({
      kind: "duplicate-agent",
      relativePath: "data/aiAgentBuilderAgent.js",
      message: "Root data/ duplicates worker/data/ agent module",
      severity: "warn",
    });
  }

  return anomalies;
}

export function scanRepository(repoRoot: string): ScanResult {
  const files: FileMetadata[] = [];

  for (const root of SCAN_ROOTS) {
    const absRoot = join(repoRoot, root);
    try {
      if (statSync(absRoot).isDirectory()) {
        walkDir(absRoot, repoRoot, files);
      }
    } catch {
      continue;
    }
  }

  collectRootFiles(repoRoot, files);
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  return {
    repoRoot,
    files,
    anomalies: detectAnomalies(repoRoot, files),
    scannedAt: new Date().toISOString(),
  };
}

export function isBeaconPath(relativePath: string): boolean {
  const normalized = normalizePath(relativePath);
  return normalized.startsWith("msh-ops/beacon/");
}

export { normalizePath };

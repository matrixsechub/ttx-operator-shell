import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  ImportGraphResult,
  RefactorSuggestion,
  ScanResult,
  StructuralIssue,
} from "../types.ts";
import { BARREL_FORBIDDEN_DIRS } from "../types.ts";
import { analyzeImports } from "./importGraph.ts";

const BEACON_TS_REQUIRED = ["id", "state", "axis", "priorities", "authority", "mandate"];

function readJsonSafe(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function checkVersionDrift(repoRoot: string): StructuralIssue[] {
  const issues: StructuralIssue[] = [];
  const pkg = readJsonSafe(join(repoRoot, "package.json")) as { version?: string } | null;
  let wranglerContent: string;
  try {
    wranglerContent = readFileSync(join(repoRoot, "wrangler.jsonc"), "utf8");
  } catch {
    return issues;
  }

  const versionMatch = wranglerContent.match(/"APP_VERSION"\s*:\s*"([^"]+)"/);
  const appVersion = versionMatch?.[1];
  if (pkg?.version && appVersion && pkg.version !== appVersion) {
    issues.push({
      ruleId: "schema-drift-version",
      severity: "error",
      relativePath: "wrangler.jsonc",
      message: `APP_VERSION (${appVersion}) does not match package.json version (${pkg.version})`,
    });
  }
  return issues;
}

function checkBeaconSchemaDrift(repoRoot: string): StructuralIssue[] {
  const issues: StructuralIssue[] = [];
  const schema = readJsonSafe(join(repoRoot, "msh-ops/beacon/beacon.schema.json")) as {
    required?: string[];
  } | null;
  if (!schema?.required) return issues;

  const missingInSchema = BEACON_TS_REQUIRED.filter((k) => !schema.required!.includes(k));
  const extraInSchema = schema.required.filter((k) => !BEACON_TS_REQUIRED.includes(k));

  if (missingInSchema.length > 0 || extraInSchema.length > 0) {
    issues.push({
      ruleId: "schema-drift-beacon",
      severity: "warn",
      relativePath: "msh-ops/beacon/beacon.schema.json",
      message: "beacon.schema.json required fields may drift from beaconSchema.ts validator",
      details: `missing: ${missingInSchema.join(", ") || "none"}; extra: ${extraInSchema.join(", ") || "none"}`,
    });
  }
  return issues;
}

function checkProtocolDrift(repoRoot: string): StructuralIssue[] {
  const issues: StructuralIssue[] = [];
  const srcPath = join(repoRoot, "src/lib/liveTtxProtocol.ts");
  const workerPath = join(repoRoot, "worker/liveTtxProtocol.ts");
  let srcContent: string;
  let workerContent: string;
  try {
    srcContent = readFileSync(srcPath, "utf8");
    workerContent = readFileSync(workerPath, "utf8");
  } catch {
    return issues;
  }

  const exportSrc = new Set(
    [...srcContent.matchAll(/export\s+(?:type\s+)?(?:interface|type|const)\s+(\w+)/g)].map((m) => m[1]),
  );
  const exportWorker = new Set(
    [...workerContent.matchAll(/export\s+(?:type\s+)?(?:interface|type|const)\s+(\w+)/g)].map((m) => m[1]),
  );

  const onlySrc = [...exportSrc].filter((e) => !exportWorker.has(e));
  const onlyWorker = [...exportWorker].filter((e) => !exportSrc.has(e));

  if (onlySrc.length > 0 || onlyWorker.length > 0) {
    issues.push({
      ruleId: "protocol-drift",
      severity: "warn",
      relativePath: "src/lib/liveTtxProtocol.ts",
      message: "liveTtxProtocol exports differ between src/lib and worker",
      details: `src-only: ${onlySrc.join(", ") || "none"}; worker-only: ${onlyWorker.join(", ") || "none"}`,
    });
  }
  return issues;
}

function checkOrphanTests(repoRoot: string, scan: ScanResult): StructuralIssue[] {
  const issues: StructuralIssue[] = [];
  let pkgContent: string;
  try {
    pkgContent = readFileSync(join(repoRoot, "package.json"), "utf8");
  } catch {
    return issues;
  }

  const testScriptMatch = pkgContent.match(/"test"\s*:\s*"([^"]+)"/);
  if (!testScriptMatch) return issues;
  const testScript = testScriptMatch[1];

  const testFiles = scan.files
    .filter((f) => f.relativePath.startsWith("tests/") && f.relativePath.endsWith(".test.ts"))
    .map((f) => f.relativePath);

  for (const testFile of testFiles) {
    if (!testScript.includes(testFile.replace(/\\/g, "/"))) {
      issues.push({
        ruleId: "orphan-test",
        severity: "info",
        relativePath: testFile,
        message: "Test file is not listed in package.json test script",
      });
    }
  }
  return issues;
}

function checkBarrelPolicy(scan: ScanResult): StructuralIssue[] {
  const issues: StructuralIssue[] = [];
  for (const file of scan.files) {
    if (!file.relativePath.endsWith("/index.ts")) continue;
    const dir = file.relativePath.replace(/\/index\.ts$/, "");
    if ((BARREL_FORBIDDEN_DIRS as readonly string[]).some((d) => dir === d || dir.startsWith(`${d}/`))) {
      issues.push({
        ruleId: "barrel-policy",
        severity: "warn",
        relativePath: file.relativePath,
        message: "Barrel index.ts in forbidden directory — project policy prefers explicit imports",
      });
    }
  }
  return issues;
}

function checkMisplacedAgents(scan: ScanResult): StructuralIssue[] {
  const issues: StructuralIssue[] = [];
  for (const file of scan.files) {
    const basename = file.relativePath.split("/").pop() ?? "";
    if (!/Agent\.ts$/.test(basename)) continue;
    if (file.relativePath.startsWith("worker/data/")) continue;
    if (file.relativePath.startsWith("msh-ops/agents/")) continue;
    if (file.relativePath.startsWith("tests/")) continue;
    issues.push({
      ruleId: "misplaced-agent",
      severity: "warn",
      relativePath: file.relativePath,
      message: "Agent module should live in worker/data/*Agent.ts or msh-ops/agents/",
    });
  }
  return issues;
}

function checkComponentPageImports(repoRoot: string, scan: ScanResult): StructuralIssue[] {
  const issues: StructuralIssue[] = [];
  for (const file of scan.files) {
    if (!file.relativePath.startsWith("src/components/")) continue;
    if (!/\.(ts|tsx)$/.test(file.relativePath)) continue;
    let content: string;
    try {
      content = readFileSync(join(repoRoot, file.relativePath), "utf8");
    } catch {
      continue;
    }
    if (/from\s+["'][^"']*pages\//.test(content)) {
      issues.push({
        ruleId: "component-page-import",
        severity: "warn",
        relativePath: file.relativePath,
        message: "Component imports from pages/ — layer violation",
      });
    }
  }
  return issues;
}

function anomaliesToIssues(scan: ScanResult): StructuralIssue[] {
  return scan.anomalies.map((a) => ({
    ruleId: a.kind,
    severity: a.severity,
    relativePath: a.relativePath,
    message: a.message,
  }));
}

function cyclesToIssues(importGraph: ImportGraphResult): StructuralIssue[] {
  return importGraph.cycles.map((c) => ({
    ruleId: "circular-import",
    severity: "error",
    relativePath: c.chain[0] ?? "",
    message: `Circular import chain: ${c.chain.join(" → ")}`,
  }));
}

function deadExportsToSuggestions(
  importGraph: ImportGraphResult,
  startId: number,
): RefactorSuggestion[] {
  return importGraph.deadExports.map((d, i) => ({
    id: `ORG-${String(startId + i).padStart(3, "0")}`,
    action: "remove-dead-code" as const,
    severity: "info" as const,
    relativePath: d.relativePath,
    description: `Remove potentially dead file (exports: ${d.exportNames.join(", ")})`,
    ruleId: "dead-export",
    autoFixable: true,
  }));
}

function issuesToMoveSuggestions(issues: StructuralIssue[], startId: number): RefactorSuggestion[] {
  const suggestions: RefactorSuggestion[] = [];
  let id = startId;

  for (const issue of issues) {
    if (issue.ruleId === "misplaced-agent" && issue.relativePath.includes("data/")) {
      const basename = issue.relativePath.split("/").pop()!;
      suggestions.push({
        id: `ORG-${String(id++).padStart(3, "0")}`,
        action: "move-file",
        severity: issue.severity,
        relativePath: issue.relativePath,
        targetPath: `worker/data/${basename}`,
        description: `Move agent to worker/data/${basename}`,
        ruleId: issue.ruleId,
        autoFixable: true,
      });
    }
  }
  return suggestions;
}

export interface StructureAnalysisResult {
  issues: StructuralIssue[];
  suggestions: RefactorSuggestion[];
  importGraph: ImportGraphResult;
}

export function analyzeStructure(repoRoot: string, scan: ScanResult): StructureAnalysisResult {
  const importGraph = analyzeImports(repoRoot, scan.files);

  const issues: StructuralIssue[] = [
    ...anomaliesToIssues(scan),
    ...checkVersionDrift(repoRoot),
    ...checkBeaconSchemaDrift(repoRoot),
    ...checkProtocolDrift(repoRoot),
    ...checkOrphanTests(repoRoot, scan),
    ...checkBarrelPolicy(scan),
    ...checkMisplacedAgents(scan),
    ...checkComponentPageImports(repoRoot, scan),
    ...cyclesToIssues(importGraph),
  ];

  const deduped = new Map<string, StructuralIssue>();
  for (const issue of issues) {
    const key = `${issue.ruleId}:${issue.relativePath}:${issue.message}`;
    if (!deduped.has(key)) deduped.set(key, issue);
  }

  const uniqueIssues = [...deduped.values()].sort((a, b) => {
    const severityOrder = { error: 0, warn: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  let nextId = 1;
  const deadSuggestions = deadExportsToSuggestions(importGraph, nextId);
  nextId += deadSuggestions.length;
  const moveSuggestions = issuesToMoveSuggestions(uniqueIssues, nextId);

  const suggestions = [...moveSuggestions, ...deadSuggestions];

  return { issues: uniqueIssues, suggestions, importGraph };
}

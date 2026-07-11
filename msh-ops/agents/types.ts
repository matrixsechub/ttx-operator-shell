export type RepoLayer = "src" | "worker" | "msh-ops" | "scripts" | "tests" | "other";

export type AgentActionClass = "C0" | "C1" | "C2" | "C3" | "C4" | "C5" | "C6";

export type IssueSeverity = "error" | "warn" | "info";

export type RefactorActionKind =
  | "move-file"
  | "rename-file"
  | "update-imports"
  | "remove-dead-code"
  | "create-barrel";

export interface FileMetadata {
  relativePath: string;
  extension: string;
  sizeBytes: number;
  layer: RepoLayer;
}

export interface ScanAnomaly {
  kind: string;
  relativePath: string;
  message: string;
  severity: IssueSeverity;
}

export interface ScanResult {
  repoRoot: string;
  files: FileMetadata[];
  anomalies: ScanAnomaly[];
  scannedAt: string;
}

export interface StructuralIssue {
  ruleId: string;
  severity: IssueSeverity;
  relativePath: string;
  message: string;
  details?: string;
}

export interface RefactorSuggestion {
  id: string;
  action: RefactorActionKind;
  severity: IssueSeverity;
  relativePath: string;
  targetPath?: string;
  description: string;
  ruleId: string;
  autoFixable: boolean;
}

export interface ImportCycle {
  chain: string[];
}

export interface DeadExportCandidate {
  relativePath: string;
  exportNames: string[];
}

export interface ImportGraphResult {
  cycles: ImportCycle[];
  deadExports: DeadExportCandidate[];
}

export interface OrganizerReport {
  agentId: "OrganizerAgent";
  mode: "advisory";
  repoRoot: string;
  scannedAt: string;
  scan: ScanResult;
  issues: StructuralIssue[];
  suggestions: RefactorSuggestion[];
  importGraph: ImportGraphResult;
  summary: {
    errorCount: number;
    warnCount: number;
    infoCount: number;
    suggestionCount: number;
    cycleCount: number;
  };
}

export interface RefactorPlanAction {
  suggestionId: string;
  action: RefactorActionKind;
  relativePath: string;
  targetPath?: string;
}

export interface RefactorPlan {
  actions: RefactorPlanAction[];
  description: string;
}

export interface RefactorApplyResult {
  applied: string[];
  skipped: string[];
  errors: string[];
}

export const BEACON_PROTECTED_PATHS = [
  "msh-ops/beacon/northstar.json",
  "msh-ops/beacon/beacon.hash",
  "msh-ops/beacon/beaconIntegrity.ts",
] as const;

export const BARREL_FORBIDDEN_DIRS = ["src/components", "src/pages"] as const;

export const SCAN_ROOTS = [
  "src",
  "worker",
  "msh-ops",
  "scripts",
  "tests",
] as const;

export const IGNORE_SEGMENTS = [
  "node_modules",
  "dist",
  ".wrangler",
  ".artifacts",
  "dist-dryrun",
  "dist-staging-dryrun",
  ".claude",
] as const;

import type { AgentActionClass } from "./types.ts";
import { runOrganizerAnalysis } from "./OrganizerAgent.ts";

export interface OrganizerFinding {
  id: string;
  severity: "error" | "warn" | "info";
  category: string;
  message: string;
  paths: string[];
}

export interface OrganizerReportV1 {
  reportId: string;
  beaconHash: string;
  codexHash: string;
  currentStructure: unknown;
  findings: OrganizerFinding[];
  proposedStructure?: unknown;
  migrationSteps: string[];
  affectedFiles: string[];
  risks: string[];
  rollbackPlan: string[];
  requiredActionClass: AgentActionClass;
  requiresApproval: boolean;
}

const MAX_FINDINGS = 200;

export async function runOrganizerReportV1(
  repoRoot: string,
  context: { beaconHash?: string; codexHash?: string } = {},
): Promise<OrganizerReportV1> {
  const base = await runOrganizerAnalysis(repoRoot);
  const beaconHash = context.beaconHash ?? "offline-scan";
  const codexHash = context.codexHash ?? "offline-scan";

  const findings: OrganizerFinding[] = base.issues.slice(0, MAX_FINDINGS).map((issue) => ({
    id: issue.ruleId,
    severity: issue.severity,
    category: "structure",
    message: issue.message,
    paths: [issue.relativePath],
  }));

  for (const suggestion of base.suggestions.slice(0, MAX_FINDINGS - findings.length)) {
    findings.push({
      id: suggestion.id,
      severity: suggestion.severity,
      category: "refactor-suggestion",
      message: suggestion.description,
      paths: [suggestion.relativePath, ...(suggestion.targetPath ? [suggestion.targetPath] : [])],
    });
  }

  const requiresApproval = findings.some((finding) => finding.severity === "error");

  return {
    reportId: crypto.randomUUID(),
    beaconHash,
    codexHash,
    currentStructure: {
      scannedFiles: base.scan.files.length,
      layers: [...new Set(base.scan.files.map((file) => file.layer))],
      summary: base.summary,
    },
    findings,
    migrationSteps: requiresApproval
      ? [
          "Create Action Proposal with rollback plan",
          "Operator approves signed receipt",
          "Execute bounded refactor via RefactorAgent proposal",
        ]
      : ["Review findings manually — no persistent change required"],
    affectedFiles: [...new Set(findings.flatMap((finding) => finding.paths))].slice(0, 100),
    risks: ["Large refactors must be split into independent proposals", "OrganizerAgent cannot apply changes"],
    rollbackPlan: ["Revert git working tree changes", "Restore prior Codex manifest entry if moved"],
    requiredActionClass: requiresApproval ? "C3" : "C1",
    requiresApproval,
  };
}

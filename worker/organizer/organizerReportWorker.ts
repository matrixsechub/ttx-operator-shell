import { getCodexManifest, getCodexManifestSnapshot } from "../codex/manifestHash";

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
  requiredActionClass: "C0" | "C1" | "C2" | "C3" | "C4" | "C5" | "C6";
  requiresApproval: boolean;
}

export async function buildOrganizerReportFromCodex(): Promise<OrganizerReportV1> {
  const codex = await getCodexManifestSnapshot();
  const manifest = getCodexManifest() as {
    components?: Array<{ id: string; sourcePaths?: string[]; tests?: string[]; knownRisks?: string[] }>;
    mutation_routes?: Array<{ path: string; governed?: boolean; enforcement?: string; action_class?: string }>;
  };

  const findings: OrganizerFinding[] = [];
  for (const component of manifest.components ?? []) {
    if (!component.tests?.length) {
      findings.push({
        id: `missing-tests-${component.id}`,
        severity: "warn",
        category: "coverage",
        message: `Component ${component.id} has no registered tests`,
        paths: component.sourcePaths ?? [],
      });
    }
    for (const risk of component.knownRisks ?? []) {
      findings.push({
        id: `risk-${component.id}`,
        severity: "info",
        category: "risk",
        message: risk,
        paths: component.sourcePaths ?? [],
      });
    }
  }

  const ungoverned = (manifest.mutation_routes ?? []).filter(
    (route) =>
      route.enforcement === "disabled_staging_prod" ||
      (!route.governed && /^C[2-6]$/.test(String(route.action_class ?? ""))),
  );

  for (const route of ungoverned.slice(0, 50)) {
    findings.push({
      id: `ungoverned-${route.path}`,
      severity: "warn",
      category: "governance",
      message: `Route pending governance: ${route.path}`,
      paths: [route.path],
    });
  }

  const requiresApproval = findings.some((finding) => finding.severity === "error");

  return {
    reportId: crypto.randomUUID(),
    beaconHash: "codex-scan",
    codexHash: codex.manifestHash,
    currentStructure: {
      componentCount: manifest.components?.length ?? 0,
      mutationRouteCount: manifest.mutation_routes?.length ?? 0,
      scanMode: "codex-inventory",
    },
    findings: findings.slice(0, 200),
    migrationSteps: requiresApproval
      ? ["Create Action Proposal with rollback plan", "Operator approves signed receipt"]
      : ["Review codex inventory findings"],
    affectedFiles: [...new Set(findings.flatMap((finding) => finding.paths))].slice(0, 100),
    risks: ["Codex scan is inventory-only — run npm run organizer for full filesystem scan"],
    rollbackPlan: ["No persistent changes applied by codex scan"],
    requiredActionClass: requiresApproval ? "C3" : "C1",
    requiresApproval,
  };
}

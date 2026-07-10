import type { OrganizerReport } from "./types.ts";
import { scanRepository } from "./utils/fileScanner.ts";
import { analyzeStructure } from "./utils/structureAnalyzer.ts";

export async function runOrganizerAnalysis(repoRoot: string): Promise<OrganizerReport> {
  const scan = scanRepository(repoRoot);
  const analysis = analyzeStructure(repoRoot, scan);

  const errorCount = analysis.issues.filter((i) => i.severity === "error").length;
  const warnCount = analysis.issues.filter((i) => i.severity === "warn").length;
  const infoCount = analysis.issues.filter((i) => i.severity === "info").length;

  return {
    agentId: "OrganizerAgent",
    mode: "advisory",
    repoRoot,
    scannedAt: scan.scannedAt,
    scan,
    issues: analysis.issues,
    suggestions: analysis.suggestions,
    importGraph: analysis.importGraph,
    summary: {
      errorCount,
      warnCount,
      infoCount,
      suggestionCount: analysis.suggestions.length,
      cycleCount: analysis.importGraph.cycles.length,
    },
  };
}

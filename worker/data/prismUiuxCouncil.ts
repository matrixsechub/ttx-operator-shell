import type { UiUxAudit, UiUxFinding, UiUxReleaseRecommendation } from "./prismUiuxTypes";
import { PRISM_UIUX_AGENT_ID } from "./prismUiuxTypes";

export interface PrismCouncilEnvelope {
  agentId: typeof PRISM_UIUX_AGENT_ID;
  advisoryOnly: true;
  problemFrame: string;
  consensus: string;
  activeDisagreements: string[];
  recommendedPath: string;
}

function topFindings(findings: UiUxFinding[], limit = 3): UiUxFinding[] {
  const rank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  return [...findings].sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, limit);
}

function releasePath(recommendation: UiUxReleaseRecommendation): string {
  switch (recommendation) {
    case "PASS":
      return "Proceed with release; no blocking UI/UX issues detected.";
    case "PASS_WITH_ADVISORIES":
      return "Release is acceptable with documented advisories; schedule follow-up fixes.";
    case "CHANGES_REQUIRED":
      return "Address high-severity findings before release; re-run PRISM audit after fixes.";
    case "BLOCK_RELEASE":
      return "Do not release until critical UI/UX blockers are resolved and re-audited.";
    default: {
      const never: never = recommendation;
      return never;
    }
  }
}

export function buildPrismCouncilEnvelope(audit: Pick<UiUxAudit, "mode" | "routes" | "component" | "viewport" | "scorecard" | "releaseRecommendation" | "findings">): PrismCouncilEnvelope {
  const scope = (audit.component ?? audit.routes.join(", ")) || "unspecified scope";
  const critical = audit.findings.filter((f) => f.severity === "critical").length;
  const high = audit.findings.filter((f) => f.severity === "high").length;
  const highlights = topFindings(audit.findings);

  const problemFrame =
    `PRISM evaluated ${audit.mode} on ${scope} (${audit.viewport}). ` +
    `Overall score ${audit.scorecard.overall}/100 with ${critical} critical and ${high} high findings.`;

  const consensus =
    highlights.length === 0
      ? "No material UI/UX regressions identified in supplied metadata."
      : `Priority issues: ${highlights.map((f) => f.recommendation).join("; ")}`;

  const activeDisagreements: string[] = [];
  if (audit.scorecard.accessibility < 70 && audit.scorecard.usability >= 80) {
    activeDisagreements.push("Usability appears adequate while accessibility signals remain weak — verify with live assistive-tech testing.");
  }
  if (audit.scorecard.conversion < 65 && audit.scorecard.visualHierarchy >= 75) {
    activeDisagreements.push("Visual hierarchy is strong but conversion friction persists — validate CTA placement with funnel analytics.");
  }
  if (audit.findings.some((f) => f.confidence < 0.6)) {
    activeDisagreements.push("Some findings have low confidence due to fixture-only metadata; confirm with Playwright/axe capture.");
  }

  return {
    agentId: PRISM_UIUX_AGENT_ID,
    advisoryOnly: true,
    problemFrame,
    consensus,
    activeDisagreements,
    recommendedPath: releasePath(audit.releaseRecommendation),
  };
}

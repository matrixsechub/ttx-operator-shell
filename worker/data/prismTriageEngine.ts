import type { UiUxAudit, UiUxFinding, UiUxFindingCategory, UiUxFindingSeverity } from "./prismUiuxTypes";
import type { PrismTriageItem, PrismTriageSeverity, PrismTriageStatus } from "./prismTriageTypes";
import { assertPrismTriageInvariants } from "./prismTriageTypes";

const SEVERITY_RANK: Record<UiUxFindingSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

const SEVERITY_WEIGHT: Record<PrismTriageSeverity, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
};

const ROUTE_IMPORTANCE: Record<string, number> = {
  "/login": 45,
  "/operator/uiux-expert": 42,
  "/operator/uiux-expert/triage": 42,
  "/register": 38,
  "/intake": 38,
  "/enter": 35,
  "/": 28,
  "/services": 26,
  "/contact": 24,
  "/status": 22,
};

const RELEASE_POSTURE_BONUS: Record<UiUxAudit["releaseRecommendation"], number> = {
  BLOCK_RELEASE: 25,
  CHANGES_REQUIRED: 15,
  PASS_WITH_ADVISORIES: 5,
  PASS: 0,
};

const CATEGORY_ACCESSIBILITY_BONUS: Partial<Record<UiUxFindingCategory, number>> = {
  accessibility: 20,
  responsive: 12,
  conversion: 10,
  usability: 8,
};

const COSMETIC_CATEGORIES = new Set<UiUxFindingCategory>(["visual_hierarchy", "design_system"]);

export function normalizeRecommendationKey(recommendation: string): string {
  return recommendation
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 12)
    .join(" ");
}

export function normalizeAcceptanceCriteriaKey(criteria: string[]): string {
  return [...criteria].sort().join("|").toLowerCase();
}

export function buildFindingGroupKey(finding: UiUxFinding): string {
  const route = finding.route ?? "_no_route";
  const component = finding.component ?? "_no_component";
  const recKey = normalizeRecommendationKey(finding.recommendation);
  const criteriaKey = normalizeAcceptanceCriteriaKey(finding.acceptanceCriteria);
  return [route, component, finding.category, finding.viewport, recKey, criteriaKey].join("::");
}

export function highestSeverity(findings: UiUxFinding[]): PrismTriageSeverity {
  let max = 0;
  let result: PrismTriageSeverity = "low";
  for (const finding of findings) {
    const rank = SEVERITY_RANK[finding.severity];
    if (rank > max) {
      max = rank;
      if (finding.severity === "info") continue;
      result = finding.severity as PrismTriageSeverity;
    }
  }
  return result;
}

export function routeImportanceWeight(route: string): number {
  const normalized = route.replace(/\/$/, "") || "/";
  if (ROUTE_IMPORTANCE[normalized] !== undefined) {
    return ROUTE_IMPORTANCE[normalized];
  }
  if (normalized.startsWith("/operator")) return 40;
  if (normalized.startsWith("/register") || normalized.startsWith("/intake")) return 36;
  return 10;
}

export function computePriorityScore(
  findings: UiUxFinding[],
  audit: UiUxAudit,
): number {
  const severity = highestSeverity(findings);
  let score = SEVERITY_WEIGHT[severity];

  const routes = [...new Set(findings.map((f) => f.route).filter(Boolean) as string[])];
  if (routes.length === 0 && audit.routes.length > 0) {
    score += Math.max(...audit.routes.map(routeImportanceWeight));
  } else {
    score += Math.max(0, ...routes.map(routeImportanceWeight));
  }

  const viewports = new Set(findings.map((f) => f.viewport));
  if (viewports.has("mobile") || audit.viewport === "mobile") {
    score += 12;
  }
  if (viewports.size > 1 || audit.viewport === "all") {
    score += 8;
  }

  for (const finding of findings) {
    const catBonus = CATEGORY_ACCESSIBILITY_BONUS[finding.category] ?? 0;
    score += catBonus;
    if (finding.category === "accessibility" && (finding.severity === "critical" || finding.severity === "high")) {
      score += finding.severity === "critical" ? 30 : 20;
    }
    if (finding.category === "responsive" && finding.severity !== "low" && finding.severity !== "info") {
      score += 15;
    }
    if (
      COSMETIC_CATEGORIES.has(finding.category) &&
      (finding.severity === "low" || finding.severity === "info")
    ) {
      score += 3;
    }
    if (finding.category === "conversion" || finding.category === "usability") {
      const route = finding.route ?? "";
      if (["/enter", "/register", "/intake"].some((r) => route.startsWith(r))) {
        score += 18;
      }
    }
    const hasBrowser = finding.evidence.some((e) => e.type === "browser");
    const hasFixture = finding.evidence.some((e) => e.type === "fixture");
    if (hasBrowser && hasFixture) {
      score += 10;
    } else if (hasBrowser || hasFixture) {
      score += 5;
    }
    score -= Math.round((1 - finding.confidence) * 20);
  }

  score += RELEASE_POSTURE_BONUS[audit.releaseRecommendation];

  if (findings.some((f) => f.userImpact.toLowerCase().includes("block"))) {
    score += 15;
  }

  return Math.max(0, Math.round(score));
}

export function buildEvidenceSummary(findings: UiUxFinding[]): string {
  const summaries = findings
    .flatMap((f) => f.evidence.map((e) => e.summary))
    .slice(0, 4);
  return summaries.join("; ") || "PRISM audit findings grouped for operator triage.";
}

export function buildTriageTitle(findings: UiUxFinding[]): string {
  const primary = findings[0];
  if (!primary) return "PRISM triage item";
  const route = primary.route ? ` on ${primary.route}` : "";
  return `[${primary.category}] ${primary.severity}${route}`;
}

async function stableTriageId(auditId: string, findingIds: string[], groupKey: string): Promise<string> {
  const payload = `${auditId}:${[...findingIds].sort().join(",")}:${groupKey}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `triage-${hex.slice(0, 32)}`;
}

async function triageEvidenceHash(
  auditId: string,
  findingIds: string[],
  sourceEvidenceHash: string,
): Promise<string> {
  const payload = JSON.stringify({ auditId, findingIds: [...findingIds].sort(), sourceEvidenceHash });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

export function groupFindingsForTriage(findings: UiUxFinding[]): UiUxFinding[][] {
  const openFindings = findings.filter((f) => f.status === "open" || f.status === "deferred");
  const groups = new Map<string, UiUxFinding[]>();

  for (const finding of openFindings) {
    const key = buildFindingGroupKey(finding);
    const existing = groups.get(key) ?? [];
    existing.push(finding);
    groups.set(key, existing);
  }

  return [...groups.values()].filter((group) => group.length > 0);
}

export async function buildTriageItemFromGroup(
  audit: UiUxAudit,
  findings: UiUxFinding[],
  options: { existingStatus?: PrismTriageStatus; sourceCouncilPacketId?: string } = {},
): Promise<PrismTriageItem> {
  const findingIds = findings.map((f) => f.id);
  const groupKey = buildFindingGroupKey(findings[0]!);
  const triageId = await stableTriageId(audit.auditId, findingIds, groupKey);
  const now = new Date().toISOString();
  const evidenceHash = await triageEvidenceHash(audit.auditId, findingIds, audit.evidenceHash);

  const routes = [...new Set(findings.map((f) => f.route).filter(Boolean) as string[])];
  const viewports = [...new Set(findings.map((f) => f.viewport))];
  const categories = [...new Set(findings.map((f) => f.category))];
  const acceptanceCriteria = [...new Set(findings.flatMap((f) => f.acceptanceCriteria))];

  const item: PrismTriageItem = {
    triageId,
    sourceAuditId: audit.auditId,
    sourceFindingIds: findingIds,
    sourceCouncilPacketId: options.sourceCouncilPacketId,
    title: buildTriageTitle(findings),
    routes: routes.length > 0 ? routes : [...audit.routes],
    viewports,
    categories,
    highestSeverity: highestSeverity(findings),
    priorityScore: computePriorityScore(findings, audit),
    status: options.existingStatus ?? "new",
    userImpact: findings.map((f) => f.userImpact).join(" "),
    evidenceSummary: buildEvidenceSummary(findings),
    recommendation: findings[0]?.recommendation ?? "Review grouped PRISM findings.",
    acceptanceCriteria,
    createdAt: now,
    updatedAt: now,
    advisoryOnly: true,
    mutationAuthorized: false,
    operatorDecisionRequired: true,
    evidenceHash,
  };

  assertPrismTriageInvariants(item);
  return item;
}

export async function generateTriageItemsFromAudit(
  audit: UiUxAudit,
  options: { existingById?: Map<string, PrismTriageItem> } = {},
): Promise<PrismTriageItem[]> {
  const groups = groupFindingsForTriage(audit.findings);
  const items: PrismTriageItem[] = [];

  for (const group of groups) {
    const preview = await buildTriageItemFromGroup(audit, group);
    const existing = options.existingById?.get(preview.triageId);
    const item = await buildTriageItemFromGroup(audit, group, {
      existingStatus: existing?.status,
      sourceCouncilPacketId: audit.councilEnvelope?.agentId,
    });
    if (existing) {
      item.createdAt = existing.createdAt;
      if (existing.dispositionReason) {
        item.dispositionReason = existing.dispositionReason;
      }
    }
    items.push(item);
  }

  return items.sort((a, b) => b.priorityScore - a.priorityScore || a.triageId.localeCompare(b.triageId));
}

export function buildTriageSummary(items: PrismTriageItem[]): import("./prismTriageTypes").PrismTriageSummary {
  return {
    total: items.length,
    critical: items.filter((i) => i.highestSeverity === "critical").length,
    high: items.filter((i) => i.highestSeverity === "high").length,
    proposalReady: items.filter((i) => i.status === "proposal_ready").length,
    operatorDecisionRequired: items.filter(
      (i) => i.operatorDecisionRequired && !["dismissed", "superseded", "accepted_for_planning"].includes(i.status),
    ).length,
  };
}

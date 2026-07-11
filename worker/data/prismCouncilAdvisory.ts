import type { PrismCouncilEnvelope } from "./prismUiuxCouncil";
import type {
  UiUxAudit,
  UiUxAuditSummary,
  UiUxReleaseRecommendation,
} from "./prismUiuxTypes";
import { listUiUxAuditSummaries, readUiUxAudit, type PrismUiuxStorageEnv } from "../prismUiuxStorage";

export type PrismCouncilAdvisoryItem = {
  auditId: string;
  mode: UiUxAudit["mode"];
  routes: string[];
  viewport: UiUxAudit["viewport"];
  overallScore: number;
  releaseRecommendation: UiUxReleaseRecommendation;
  criticalCount: number;
  findingCount: number;
  createdAt: string;
  evidenceHash: string;
  advisoryRank: number;
  briefingSummary: string;
  councilEnvelope: PrismCouncilEnvelope;
  advisoryOnly: true;
  mutationAuthorized: false;
};

export type PrismCouncilAdvisoryBundle = {
  assembledAt: string;
  source: "prism_ttx_state";
  advisoryOnly: true;
  mutationAuthorized: false;
  rankedAuditIds: string[];
  items: PrismCouncilAdvisoryItem[];
  evidenceHash: string;
};

const RELEASE_RANK: Record<UiUxReleaseRecommendation, number> = {
  BLOCK_RELEASE: 0,
  CHANGES_REQUIRED: 1,
  PASS_WITH_ADVISORIES: 2,
  PASS: 3,
};

export const DEFAULT_PRISM_ADVISORY_LIMIT = 10;

function advisoryEvidenceHash(items: PrismCouncilAdvisoryItem[]): string {
  const payload = items.map((item) => ({
    auditId: item.auditId,
    rank: item.advisoryRank,
    evidenceHash: item.evidenceHash,
  }));
  return JSON.stringify(payload);
}

export function buildBriefingSummary(envelope: PrismCouncilEnvelope): string {
  const disagreement =
    envelope.activeDisagreements.length > 0
      ? ` Open questions: ${envelope.activeDisagreements[0]}`
      : "";
  return `${envelope.problemFrame} ${envelope.recommendedPath}${disagreement}`.trim();
}

export function assertPrismCouncilAdvisoryInvariants(item: PrismCouncilAdvisoryItem): void {
  if (item.advisoryOnly !== true) {
    throw new Error("PRISM council advisory advisoryOnly invariant violated");
  }
  if (item.mutationAuthorized !== false) {
    throw new Error("PRISM council advisory mutationAuthorized invariant violated");
  }
  if (item.councilEnvelope.advisoryOnly !== true) {
    throw new Error("PRISM council envelope advisoryOnly invariant violated");
  }
}

export function rankAuditSummaries(summaries: UiUxAuditSummary[]): UiUxAuditSummary[] {
  return [...summaries].sort((a, b) => {
    const releaseDelta = RELEASE_RANK[a.releaseRecommendation] - RELEASE_RANK[b.releaseRecommendation];
    if (releaseDelta !== 0) return releaseDelta;
    if (b.criticalCount !== a.criticalCount) return b.criticalCount - a.criticalCount;
    if (a.overallScore !== b.overallScore) return a.overallScore - b.overallScore;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function projectAuditToAdvisoryItem(audit: UiUxAudit, advisoryRank: number): PrismCouncilAdvisoryItem {
  const item: PrismCouncilAdvisoryItem = {
    auditId: audit.auditId,
    mode: audit.mode,
    routes: audit.routes,
    viewport: audit.viewport,
    overallScore: audit.scorecard.overall,
    releaseRecommendation: audit.releaseRecommendation,
    criticalCount: audit.findings.filter((f) => f.severity === "critical").length,
    findingCount: audit.findings.length,
    createdAt: audit.createdAt,
    evidenceHash: audit.evidenceHash,
    advisoryRank,
    briefingSummary: buildBriefingSummary(audit.councilEnvelope),
    councilEnvelope: audit.councilEnvelope,
    advisoryOnly: true,
    mutationAuthorized: false,
  };
  assertPrismCouncilAdvisoryInvariants(item);
  return item;
}

export async function buildPrismCouncilAdvisoryBundle(
  env: PrismUiuxStorageEnv,
  options: { limit?: number; auditId?: string } = {},
): Promise<PrismCouncilAdvisoryBundle> {
  const limit = options.limit ?? DEFAULT_PRISM_ADVISORY_LIMIT;

  if (options.auditId) {
    const audit = await readUiUxAudit(env, options.auditId);
    if (!audit) {
      throw new Error(`PRISM audit not found: ${options.auditId}`);
    }
    const item = projectAuditToAdvisoryItem(audit, 1);
    return {
      assembledAt: new Date().toISOString(),
      source: "prism_ttx_state",
      advisoryOnly: true,
      mutationAuthorized: false,
      rankedAuditIds: [audit.auditId],
      items: [item],
      evidenceHash: advisoryEvidenceHash([item]),
    };
  }

  const summaries = rankAuditSummaries(await listUiUxAuditSummaries(env));
  const selected = summaries.slice(0, limit);
  const items: PrismCouncilAdvisoryItem[] = [];

  for (let index = 0; index < selected.length; index += 1) {
    const summary = selected[index];
    const audit = await readUiUxAudit(env, summary.auditId);
    if (!audit?.councilEnvelope) continue;
    items.push(projectAuditToAdvisoryItem(audit, index + 1));
  }

  return {
    assembledAt: new Date().toISOString(),
    source: "prism_ttx_state",
    advisoryOnly: true,
    mutationAuthorized: false,
    rankedAuditIds: items.map((item) => item.auditId),
    items,
    evidenceHash: advisoryEvidenceHash(items),
  };
}

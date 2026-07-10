import type { IntentCaptureCategory, IntentCaptureRecord } from "./intentCaptureTypes";
import type { IntentQualificationGovernance } from "./intentQualificationGovernance";

export const INTENT_QUALIFICATION_BATCH_LIMIT = 20;

export const INTENT_QUALIFICATION_TYPES = [
  "automation_build",
  "ai_agent_build",
  "security_audit",
  "marketplace_module",
  "service_consultation",
  "enterprise_readiness",
  "unknown",
] as const;

export type IntentQualificationType = (typeof INTENT_QUALIFICATION_TYPES)[number];

export const INTENT_QUALIFICATION_PRIORITIES = ["low", "medium", "high"] as const;

export type IntentQualificationPriority = (typeof INTENT_QUALIFICATION_PRIORITIES)[number];

export const INTENT_QUALIFICATION_ROUTE_KINDS = [
  "builder",
  "marketplace",
  "implementation_booking",
  "operator_review",
  "nurture",
] as const;

export type IntentQualificationRouteKind = (typeof INTENT_QUALIFICATION_ROUTE_KINDS)[number];

export type IntentQualificationSystemState = "RAW_DEMAND" | "QUALIFYING" | "QUALIFIED_PIPELINE";

export const INTENT_QUALIFICATION_TTL_SECONDS = 30 * 24 * 60 * 60;
export const INTENT_QUALIFICATION_ROLLUP_TTL_SECONDS = 365 * 24 * 60 * 60;
export const INTENT_QUALIFICATION_LOG_MAX = 100;

export interface IntentQualificationScoreBreakdown {
  problemClarity: number;
  implementationFit: number;
  revenuePotential: number;
  urgency: number;
  reusability: number;
  securityCompliance: number;
}

export interface IntentQualificationClassification {
  intentType: IntentQualificationType;
  classificationConfidence: number;
  rationale: string;
}

export interface IntentQualificationRouting {
  recommendedRoute: string;
  recommendedOffer: string;
  nextCtaLabel: string;
  routingRationale: string;
  routeKind: IntentQualificationRouteKind;
}

export interface IntentQualificationAdvisoryProposal {
  id: string;
  type: string;
  reason: string;
  priority: IntentQualificationPriority;
  advisory: true;
  governance: IntentQualificationGovernance;
}

export interface IntentQualificationRecord {
  captureId: string;
  sessionId: string;
  source: string;
  page: string;
  category?: IntentCaptureCategory;
  intent: string;
  sourceRoute: string;
  timestamp: string;
  classification: IntentQualificationClassification;
  score: IntentQualificationScoreBreakdown;
  totalScore: number;
  priority: IntentQualificationPriority;
  routing: IntentQualificationRouting;
  proposalIds: string[];
  qualifiedAt: string;
  intentSummary: string;
  governance: IntentQualificationGovernance;
  testRunId?: string;
}

export interface IntentQualificationRollup {
  qualified: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  bySource: Record<string, number>;
  byPage: Record<string, number>;
  byRoute: Record<string, number>;
  byOffer: Record<string, number>;
  topQualified: Array<{ captureId: string; intentSummary: string; totalScore: number; priority: IntentQualificationPriority }>;
  updatedAt: string;
}

export interface IntentQualificationReport {
  qualifiedTotal: number;
  topQualifiedIntents: IntentQualificationRecord[];
  countsByType: Record<string, number>;
  countsByPriority: Record<string, number>;
  topSources: Array<{ source: string; count: number }>;
  topPages: Array<{ page: string; count: number }>;
  topRoutes: Array<{ route: string; count: number }>;
  topRecommendedOffers: Array<{ offer: string; count: number }>;
  advisoryProposals: IntentQualificationAdvisoryProposal[];
  systemState: IntentQualificationSystemState;
  updatedAt: string;
  governance: IntentQualificationGovernance;
}

export interface QualifyBatchResult {
  qualified: IntentQualificationRecord[];
  processed: number;
  skipped: number;
  failed: number;
}

export interface IntentQualificationInput {
  record: IntentCaptureRecord;
  previewSystemType?: string;
  handoffUnlockRoute?: string;
}

export function emptyQualificationRollup(): IntentQualificationRollup {
  return {
    qualified: 0,
    byType: {},
    byPriority: {},
    bySource: {},
    byPage: {},
    byRoute: {},
    byOffer: {},
    topQualified: [],
    updatedAt: new Date().toISOString(),
  };
}

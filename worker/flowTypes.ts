export type FlowEventType =
  | "page_view"
  | "click"
  | "cta_impression"
  | "cta_click"
  | "form_start"
  | "form_submit";

export type FlowConfidence = "low" | "medium" | "high";

export type FlowSystemState = "OBSERVING" | "ANALYZING" | "OPTIMIZING";

export type FrictionRuleId =
  | "high_exit_trap"
  | "dwell_no_action"
  | "navigation_loop"
  | "cta_impression_gap"
  | "click_no_progression"
  | "form_abandon";

export type FrictionSeverity = "low" | "medium" | "high";

export type EffortEstimate = "low" | "medium" | "high";

export const FLOW_MIN_SAMPLES = 5;
export const FLOW_MAX_SESSION_STEPS = 50;
export const FLOW_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
export const FLOW_ROLLUP_TTL_SECONDS = 365 * 24 * 60 * 60;
export const FLOW_SNAPSHOT_TTL_SECONDS = 30 * 24 * 60 * 60;

export interface FlowStep {
  page: string;
  enteredAt: string;
  dwellMs: number;
  clicks: number;
  ctaImpressions: number;
  ctaClicks: number;
  formStarted: boolean;
  formSubmitted: boolean;
}

export interface FlowSessionPacket {
  sessionId: string;
  trafficSource?: string;
  landingPage: string;
  exitPage: string;
  steps: FlowStep[];
  revisitCounts: Record<string, number>;
  loopRecorded?: boolean;
  updatedAt: string;
}

export interface FlowRollup {
  sessionCount: number;
  singlePageSessions: number;
  loopSessionCount: number;
  entries: Record<string, number>;
  exits: Record<string, number>;
  pageVisits: Record<string, number>;
  transitions: Record<string, Record<string, number>>;
  dwellSumMs: Record<string, number>;
  dwellCount: Record<string, number>;
  pageClicks: Record<string, number>;
  ctaImpressions: Record<string, number>;
  ctaClicks: Record<string, number>;
  formStarts: Record<string, number>;
  formSubmits: Record<string, number>;
  pathCounts: Record<string, number>;
  updatedAt: string;
  lastSnapshotDate?: string;
}

export interface FlowEventInput {
  event: FlowEventType;
  sessionId: string;
  page: string;
  trafficSource?: string;
  ctaId?: string;
  dwellMs?: number;
  formId?: string;
  clickDelta?: number;
}

export interface FlowEventResult {
  counted: boolean;
  reason?: "invalid_session" | "invalid_event" | "invalid_page" | "step_cap";
}

export interface FlowPathSummary {
  path: string[];
  count: number;
  share: number;
}

export interface FlowDropOffPage {
  page: string;
  exitRate: number;
  visits: number;
}

export interface FlowFrictionPoint {
  page: string;
  ruleId: FrictionRuleId;
  severity: FrictionSeverity;
  evidence: string;
  sessionsAffected: number;
}

export interface FlowRecommendation {
  page: string;
  issue: string;
  suggestedChange: string;
  impactScore: number;
  confidenceScore: number;
  effortEstimate: EffortEstimate;
}

export interface FlowTrend {
  sessionsDelta: number;
  topFrictionDelta: number;
  period: string;
}

export interface FlowIntelligenceReport {
  topPaths: FlowPathSummary[];
  dropOffPages: FlowDropOffPage[];
  frictionPoints: FlowFrictionPoint[];
  recommendations: FlowRecommendation[];
  confidence: FlowConfidence;
  trend: FlowTrend;
  systemState: FlowSystemState;
}

export interface FlowAnalysis {
  topEntryPages: Array<{ page: string; count: number }>;
  topExitPages: Array<{ page: string; count: number }>;
  transitionRates: Array<{ from: string; to: string; rate: number }>;
  bounceRate: number;
  loopRate: number;
  deadEndPages: Array<{ page: string; score: number }>;
  avgDwellByPage: Record<string, number>;
  ctaCtrByKey: Record<string, number>;
}

export function emptyFlowRollup(): FlowRollup {
  return {
    sessionCount: 0,
    singlePageSessions: 0,
    loopSessionCount: 0,
    entries: {},
    exits: {},
    pageVisits: {},
    transitions: {},
    dwellSumMs: {},
    dwellCount: {},
    pageClicks: {},
    ctaImpressions: {},
    ctaClicks: {},
    formStarts: {},
    formSubmits: {},
    pathCounts: {},
    updatedAt: new Date().toISOString(),
  };
}

export function sanitizeFlowPage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return null;
  const cleaned = trimmed.split("?")[0]?.split("#")[0] ?? trimmed;
  if (cleaned.length > 128) return cleaned.slice(0, 128);
  return cleaned || null;
}

export function sanitizeCtaId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  return cleaned || null;
}

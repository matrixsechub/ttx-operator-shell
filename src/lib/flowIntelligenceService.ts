import { request, type ApiResult } from "./apiClient";

export type FlowConfidence = "low" | "medium" | "high";
export type FlowSystemState = "OBSERVING" | "ANALYZING" | "OPTIMIZING";

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
  ruleId: string;
  severity: "low" | "medium" | "high";
  evidence: string;
  sessionsAffected: number;
}

export interface FlowRecommendation {
  page: string;
  issue: string;
  suggestedChange: string;
  impactScore: number;
  confidenceScore: number;
  effortEstimate: "low" | "medium" | "high";
}

export interface FlowTrend {
  sessionsDelta: number;
  topFrictionDelta: number;
  period: string;
}

export interface FlowIntelligencePayload {
  topPaths: FlowPathSummary[];
  dropOffPages: FlowDropOffPage[];
  frictionPoints: FlowFrictionPoint[];
  recommendations: FlowRecommendation[];
  confidence: FlowConfidence;
  trend: FlowTrend;
  systemState: FlowSystemState;
  report: string;
}

export const flowIntelligenceService = {
  getReport: (): Promise<ApiResult<FlowIntelligencePayload>> => request("/api/flow/intelligence"),
};

import { request, type ApiResult } from "./apiClient";

export type IntentQualificationSystemState = "RAW_DEMAND" | "QUALIFYING" | "QUALIFIED_PIPELINE";

export interface IntentQualificationReportPayload {
  qualifiedTotal: number;
  topQualifiedIntents: Array<{
    captureId: string;
    intentSummary: string;
    totalScore: number;
    priority: "low" | "medium" | "high";
    classification: { intentType: string; classificationConfidence: number; rationale: string };
    routing: {
      recommendedRoute: string;
      recommendedOffer: string;
      nextCtaLabel: string;
      routingRationale: string;
    };
    source: string;
    page: string;
  }>;
  countsByType: Record<string, number>;
  countsByPriority: Record<string, number>;
  topSources: Array<{ source: string; count: number }>;
  topPages: Array<{ page: string; count: number }>;
  topRoutes: Array<{ route: string; count: number }>;
  topRecommendedOffers: Array<{ offer: string; count: number }>;
  advisoryProposals: Array<{
    id: string;
    type: string;
    reason: string;
    priority: "low" | "medium" | "high";
    advisory: true;
  }>;
  systemState: IntentQualificationSystemState;
  updatedAt: string;
  report: string;
  governance: {
    advisoryOnly: true;
    mutationAuthorized: false;
    operatorApprovalRequired: true;
  };
}

export const intentQualificationService = {
  getReport: (): Promise<ApiResult<IntentQualificationReportPayload>> =>
    request("/api/growth/intent-qualification/report"),
};

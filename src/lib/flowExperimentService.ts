import { request, type ApiResult } from "./apiClient";

export type FlowExperimentStatus = "RUNNING" | "WINNING" | "LOSING" | "INCONCLUSIVE";
export type FlowExperimentSystemState = "TESTING" | "LEARNING" | "READY_TO_PROMOTE";

export interface FlowVariantMetrics {
  views: number;
  ctaClicks: number;
  progressionCount: number;
  dropOffCount: number;
  intentSubmissions: number;
  conversionAttempts: number;
}

export interface FlowExperiment {
  id: string;
  page: string;
  issue: string;
  experimentType: string;
  hypothesis: string;
  variantA: string;
  variantB: string;
  successMetric: string;
  secondaryMetrics: string[];
  priority: string;
  createdAt: string;
  updatedAt: string;
}

export interface FlowExperimentOutcome {
  experiment: FlowExperiment;
  variantA: FlowVariantMetrics;
  variantB: FlowVariantMetrics;
  status: FlowExperimentStatus;
  promotionProposal: string | null;
  systemState: FlowExperimentSystemState;
}

export interface FlowExperimentReportPayload {
  activeExperiment: FlowExperiment | null;
  outcome: FlowExperimentOutcome | null;
  assignmentRule: string;
  systemState: FlowExperimentSystemState;
  report: string;
}

export const flowExperimentService = {
  getReport: (): Promise<ApiResult<FlowExperimentReportPayload>> => request("/api/flow/experiment/report"),
};

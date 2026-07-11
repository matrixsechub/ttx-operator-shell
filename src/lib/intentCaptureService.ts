import { request, type ApiResult } from "./apiClient";

export interface IntentCaptureReportPayload {
  intentRate: number;
  previewGenerationRate: number;
  handoffRate: number;
  topCapturedIntents: Array<{ text: string; count: number }>;
  topIntentPages: Array<{ page: string; count: number }>;
  topSources: Array<{ source: string; count: number }>;
  systemState: "CAPTURING_DEMAND" | "PASSIVE_TRAFFIC";
  report: string;
}

export const intentCaptureService = {
  getReport: (): Promise<ApiResult<IntentCaptureReportPayload>> => request("/api/growth/intent-capture/report"),
};

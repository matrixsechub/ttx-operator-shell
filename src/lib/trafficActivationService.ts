import { request, type ApiResult } from "./apiClient";

export interface ActivationCampaign {
  campaignId: string;
  name: string;
  description: string;
  status: string;
  targetChannels: string[];
  destinationPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivationTask {
  taskId: string;
  campaignId: string;
  channel: string;
  title: string;
  description: string;
  status: string;
  queueDate: string;
}

export interface ChannelRecommendation {
  channel: string;
  score: number;
  reasonCodes: string[];
  suggestedAction: string;
}

export interface OrganicProgress {
  totalValidSessions: number;
  qualifiedOrganicSessions: number;
  organicSourceCount: number;
  confidence: string;
  promotionEligibleWinner: string | null;
  blockers: string[];
  gates: Record<string, { target: number; current: number | Record<string, number>; met: boolean }>;
}

export interface ActivationOverview {
  progress: OrganicProgress;
  campaigns: ActivationCampaign[];
  todayQueue: ActivationTask[];
  recommendations: ChannelRecommendation[];
  safeMode: { active: boolean; blockers: string[] };
  updatedAt: string;
}

type OverviewResponse = { ok: true; overview: ActivationOverview };
type CampaignsResponse = { ok: true; campaigns: ActivationCampaign[] };
type CampaignResponse = { ok: true; campaign: ActivationCampaign };
type TasksResponse = { ok: true; tasks: ActivationTask[] };

export type MutationPayload = {
  reason: string;
  operatorApproval?: boolean;
  name?: string;
  description?: string;
  targetChannels?: string[];
  destinationPath?: string;
  channels?: string[];
  baseUrl?: string;
};

export const trafficActivationService = {
  getOverview: (): Promise<ApiResult<OverviewResponse>> =>
    request<OverviewResponse>("/api/operator/activation/overview"),

  listCampaigns: (): Promise<ApiResult<CampaignsResponse>> =>
    request<CampaignsResponse>("/api/operator/activation/campaigns"),

  createCampaign: (payload: MutationPayload): Promise<ApiResult<CampaignResponse>> =>
    request<CampaignResponse>("/api/operator/activation/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, operatorApproval: true }),
    }),

  submitCampaign: (campaignId: string, payload: MutationPayload): Promise<ApiResult<CampaignResponse>> =>
    request<CampaignResponse>(`/api/operator/activation/campaigns/${campaignId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, operatorApproval: true }),
    }),

  approveCampaign: (campaignId: string, payload: MutationPayload): Promise<ApiResult<CampaignResponse>> =>
    request<CampaignResponse>(`/api/operator/activation/campaigns/${campaignId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, operatorApproval: true }),
    }),

  activateCampaign: (campaignId: string, payload: MutationPayload): Promise<ApiResult<CampaignResponse>> =>
    request<CampaignResponse>(`/api/operator/activation/campaigns/${campaignId}/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, operatorApproval: true }),
    }),

  generateAssets: (campaignId: string, payload: MutationPayload): Promise<ApiResult<{ ok: true; assets: unknown[] }>> =>
    request(`/api/operator/activation/campaigns/${campaignId}/assets/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, operatorApproval: true }),
    }),

  generateQueue: (payload: MutationPayload): Promise<ApiResult<TasksResponse>> =>
    request<TasksResponse>("/api/operator/activation/queue/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, operatorApproval: true }),
    }),

  approveTask: (taskId: string, payload: MutationPayload): Promise<ApiResult<{ ok: true; task: ActivationTask }>> =>
    request(`/api/operator/activation/tasks/${taskId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, operatorApproval: true }),
    }),

  completeTask: (taskId: string, payload: MutationPayload): Promise<ApiResult<{ ok: true; task: ActivationTask }>> =>
    request(`/api/operator/activation/tasks/${taskId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, operatorApproval: true }),
    }),
};

import type { AdaptiveUiMode } from "../usageModeMetrics";
import type { TrafficSourceChannel } from "../trafficSources";

export const ACTIVATION_AGENT_ID = "organic-traffic-activation";

export const CAMPAIGN_STATUSES = [
  "DRAFT",
  "READY_FOR_APPROVAL",
  "APPROVED",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "ARCHIVED",
] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const TRAFFIC_QUALITY_LEVELS = [
  "UNKNOWN",
  "HUMAN_LIKELY",
  "BOT_LIKELY",
  "PREVIEW_OR_CRAWLER",
  "SYNTHETIC",
  "INTERNAL",
  "IMPOSSIBLE_EVENT_ORDER",
  "EXCESSIVE_EVENT_RATE",
] as const;

export type TrafficQuality = (typeof TRAFFIC_QUALITY_LEVELS)[number];

export const INTERACTION_SIGNALS = [
  "pointer_move",
  "pointer_click",
  "keyboard_activity",
  "scroll_depth",
  "focus_duration",
] as const;

export type InteractionSignal = (typeof INTERACTION_SIGNALS)[number];

export const CAMPAIGN_VALUE_STATUSES = [
  "ATTENTION_ONLY",
  "INTENT_VALIDATED",
  "REVENUE_INTENT_VALIDATED",
  "REVENUE_VERIFIED",
] as const;

export type CampaignValueStatus = (typeof CAMPAIGN_VALUE_STATUSES)[number];

export const ACTIVATION_TASK_STATUSES = [
  "PENDING_APPROVAL",
  "APPROVED",
  "COMPLETED",
  "SKIPPED",
] as const;

export type ActivationTaskStatus = (typeof ACTIVATION_TASK_STATUSES)[number];

export const OUTREACH_ASSET_STATUSES = ["DRAFT", "APPROVED", "USED"] as const;

export type OutreachAssetStatus = (typeof OUTREACH_ASSET_STATUSES)[number];

export interface AttributionTouch {
  src: TrafficSourceChannel | string;
  campaignId?: string;
  contentId?: string;
  ctaId?: string;
  capturedAt: string;
}

export interface SessionAttribution {
  sessionId: string;
  firstTouch: AttributionTouch;
  lastTouch?: AttributionTouch;
  campaignId?: string;
  rejected?: boolean;
  rejectionReason?: string;
  updatedAt: string;
}

export interface ActivationCampaign {
  campaignId: string;
  name: string;
  description: string;
  status: CampaignStatus;
  targetChannels: string[];
  destinationPath: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  activatedAt?: string;
  completedAt?: string;
  operatorNotes?: string;
}

export interface OutreachAsset {
  assetId: string;
  campaignId: string;
  channel: string;
  templateId: string;
  title: string;
  body: string;
  trackedUrl: string;
  complianceNotes: string;
  status: OutreachAssetStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  usedAt?: string;
}

export interface ActivationTask {
  taskId: string;
  campaignId: string;
  channel: string;
  title: string;
  description: string;
  assetId?: string;
  status: ActivationTaskStatus;
  queueDate: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  skipReason?: string;
}

export interface CampaignMetrics {
  campaignId: string;
  qualifiedOrganicSessions: number;
  totalSessions: number;
  diagnosticSessions: number;
  visits: number;
  entryClicks: number;
  marketplaceClicks: number;
  serviceViews: number;
  intakeStarted: number;
  intakeCompleted: number;
  checkoutStarted: number;
  purchaseCompleted: number;
  entryRate: number;
  marketplaceRate: number;
  intakeRate: number;
  checkoutRate: number;
  purchaseRate: number;
  valueStatus: CampaignValueStatus;
  byMode: Record<AdaptiveUiMode, { views: number; entryClicks: number }>;
  byChannel: Record<string, number>;
  updatedAt: string;
}

export interface ChannelRecommendation {
  channel: string;
  score: number;
  reasonCodes: string[];
  suggestedAction: string;
}

export interface OrganicActivationProgress {
  totalValidSessions: number;
  qualifiedOrganicSessions: number;
  organicSourceCount: number;
  qualifiedViewsPerMode: Record<string, number>;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  promotionEligibleWinner: string | null;
  blockers: string[];
  gates: {
    totalSessions: { target: number; current: number; met: boolean };
    qualifiedOrganic: { target: number; current: number; met: boolean };
    organicSources: { target: number; current: number; met: boolean };
    qualifiedViewsPerMode: { target: number; current: Record<string, number>; met: boolean };
  };
  updatedAt: string;
}

export interface ActivationAuditEvent {
  auditId: string;
  campaignId?: string;
  action: string;
  actor: string;
  reason: string;
  previousStatus?: CampaignStatus;
  nextStatus?: CampaignStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ActivationTelemetryEvent {
  type:
    | "activation_campaign_created"
    | "activation_campaign_transition"
    | "activation_attribution_recorded"
    | "activation_attribution_rejected"
    | "activation_quality_classified"
    | "activation_safe_mode_triggered"
    | "activation_queue_generated"
    | "activation_task_completed";
  sessionIdHash?: string;
  campaignId?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface ActivationOverview {
  progress: OrganicActivationProgress;
  campaigns: ActivationCampaign[];
  todayQueue: ActivationTask[];
  recommendations: ChannelRecommendation[];
  safeMode: ActivationSafeModeState;
  updatedAt: string;
}

export interface ActivationSafeModeState {
  active: boolean;
  blockers: string[];
  triggeredAt?: string;
}

export const ORGANIC_PROGRESS_TARGETS = {
  totalSessions: 150,
  qualifiedOrganic: 50,
  organicSources: 3,
  qualifiedViewsPerMode: 30,
} as const;

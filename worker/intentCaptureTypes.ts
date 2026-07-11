import type { AdaptiveUiMode } from "./usageModeMetrics";

export const INTENT_CAPTURE_SOURCES = [
  "reddit",
  "x",
  "direct",
  "discord",
  "slack",
  "synthetic",
] as const;

export type IntentCaptureSource = (typeof INTENT_CAPTURE_SOURCES)[number];

export const INTENT_CAPTURE_CATEGORIES = [
  "ai_agent",
  "automation",
  "security_audit",
  "marketplace_module",
  "general",
] as const;

export type IntentCaptureCategory = (typeof INTENT_CAPTURE_CATEGORIES)[number];

export type IntentHandoffEvent =
  | "preview_generated"
  | "preview_abandoned"
  | "unlock_clicked"
  | "booking_clicked"
  | "module_clicked";

export type IntentCaptureSystemState = "CAPTURING_DEMAND" | "PASSIVE_TRAFFIC";

export const INTENT_LOG_MAX = 100;
export const INTENT_TTL_SECONDS = 30 * 24 * 60 * 60;
export const INTENT_ROLLUP_TTL_SECONDS = 365 * 24 * 60 * 60;

export interface IntentInteractionDepth {
  dwellMs: number;
  scrollDepth: number;
  clicks: number;
}

export interface IntentCaptureRecord {
  captureId: string;
  sessionId: string;
  source: IntentCaptureSource;
  page: string;
  uiMode: AdaptiveUiMode;
  experimentId?: string;
  variant?: "A" | "B";
  intent: string;
  category?: IntentCaptureCategory;
  interactionDepth: IntentInteractionDepth;
  timestamp: string;
  previewGenerated: boolean;
}

export interface IntentCapturePreview {
  problemSummary: string;
  suggestedSystemType: string;
  implementationPath: string;
  riskTrustNote: string;
  nextAction: string;
  builderRoute: string;
}

export interface IntentCaptureHandoff {
  unlockBlueprint: string;
  bookImplementation: string;
  exploreMarketplaceModule: string;
  requestServiceFulfillment: string;
}

export interface IntentCaptureRollup {
  captures: number;
  previews: number;
  previewAbandoned: number;
  handoffs: number;
  unlockClicks: number;
  bookingClicks: number;
  moduleClicks: number;
  bySource: Record<string, number>;
  byPage: Record<string, number>;
  topIntents: Array<{ text: string; count: number }>;
  updatedAt: string;
}

export interface IntentCaptureReport {
  intentRate: number;
  previewGenerationRate: number;
  handoffRate: number;
  topCapturedIntents: Array<{ text: string; count: number }>;
  topIntentPages: Array<{ page: string; count: number }>;
  topSources: Array<{ source: string; count: number }>;
  recentCaptures: IntentCaptureRecord[];
  systemState: IntentCaptureSystemState;
}

export function emptyIntentRollup(): IntentCaptureRollup {
  return {
    captures: 0,
    previews: 0,
    previewAbandoned: 0,
    handoffs: 0,
    unlockClicks: 0,
    bookingClicks: 0,
    moduleClicks: 0,
    bySource: {},
    byPage: {},
    topIntents: [],
    updatedAt: new Date().toISOString(),
  };
}

export function sanitizeIntentSource(value: unknown): IntentCaptureSource {
  if (typeof value !== "string") return "direct";
  const cleaned = value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 32);
  if ((INTENT_CAPTURE_SOURCES as readonly string[]).includes(cleaned)) {
    return cleaned as IntentCaptureSource;
  }
  if (cleaned === "organic" || cleaned === "synthetic_injection") return "direct";
  return "direct";
}

export function sanitizeIntentCategory(value: unknown): IntentCaptureCategory | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim().toLowerCase();
  return (INTENT_CAPTURE_CATEGORIES as readonly string[]).includes(cleaned)
    ? (cleaned as IntentCaptureCategory)
    : undefined;
}

import type { CampaignMetrics, CampaignValueStatus } from "./types";
import { campaignMetricsKey, channelMetricsKey } from "./kvKeys";
import { readSessionAttribution, hasFirstTouchAttribution } from "./attribution";
import { readSessionQuality, isQualifiedOrganicQuality } from "./trafficQuality";
import type { SignalIntegrityStatus } from "../usage";
import type { TrafficSourceChannel } from "../trafficSources";
import type { AdaptiveUiMode } from "../usageModeMetrics";

export interface CampaignMetricsEnv {
  TTX_STATE: KVNamespace;
}

const EXCLUDED_ORGANIC_SOURCES: TrafficSourceChannel[] = ["synthetic_injection", "internal"];

function emptyModeMetrics(): Record<AdaptiveUiMode, { views: number; entryClicks: number }> {
  return {
    CONFUSION: { views: 0, entryClicks: 0 },
    FRICTION: { views: 0, entryClicks: 0 },
    ENGAGED: { views: 0, entryClicks: 0 },
    DEFAULT: { views: 0, entryClicks: 0 },
  };
}

function emptyCampaignMetrics(campaignId: string): CampaignMetrics {
  return {
    campaignId,
    qualifiedOrganicSessions: 0,
    totalSessions: 0,
    diagnosticSessions: 0,
    visits: 0,
    entryClicks: 0,
    marketplaceClicks: 0,
    serviceViews: 0,
    intakeStarted: 0,
    intakeCompleted: 0,
    checkoutStarted: 0,
    purchaseCompleted: 0,
    entryRate: 0,
    marketplaceRate: 0,
    intakeRate: 0,
    checkoutRate: 0,
    purchaseRate: 0,
    valueStatus: "ATTENTION_ONLY",
    byMode: emptyModeMetrics(),
    byChannel: {},
    updatedAt: new Date().toISOString(),
  };
}

function safeRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function resolveValueStatus(metrics: CampaignMetrics): CampaignValueStatus {
  if (metrics.purchaseCompleted > 0) return "REVENUE_VERIFIED";
  if (metrics.checkoutStarted > 0 || metrics.intakeCompleted > 0) return "REVENUE_INTENT_VALIDATED";
  if (metrics.intakeStarted > 0 || metrics.marketplaceClicks > 0) return "INTENT_VALIDATED";
  return "ATTENTION_ONLY";
}

export async function readCampaignMetrics(
  env: CampaignMetricsEnv,
  campaignId: string,
): Promise<CampaignMetrics> {
  const raw = await env.TTX_STATE.get(campaignMetricsKey(campaignId));
  if (!raw) return emptyCampaignMetrics(campaignId);
  try {
    return JSON.parse(raw) as CampaignMetrics;
  } catch {
    return emptyCampaignMetrics(campaignId);
  }
}

async function writeCampaignMetrics(env: CampaignMetricsEnv, metrics: CampaignMetrics): Promise<void> {
  metrics.updatedAt = new Date().toISOString();
  await env.TTX_STATE.put(campaignMetricsKey(metrics.campaignId), JSON.stringify(metrics));
}

export interface QualifiedSessionContext {
  sessionId: string;
  trafficSource: TrafficSourceChannel | string | null;
  signalIntegrity: SignalIntegrityStatus;
  campaignId?: string;
  channel?: string;
  uiMode?: AdaptiveUiMode;
}

export async function isQualifiedOrganicSession(
  env: CampaignMetricsEnv,
  ctx: QualifiedSessionContext,
): Promise<boolean> {
  if (!ctx.trafficSource || (EXCLUDED_ORGANIC_SOURCES as readonly string[]).includes(ctx.trafficSource)) {
    return false;
  }
  if (ctx.signalIntegrity !== "VALID") return false;

  const attribution = await readSessionAttribution(env, ctx.sessionId);
  if (!hasFirstTouchAttribution(attribution)) return false;

  const quality = await readSessionQuality(env, ctx.sessionId);
  if (!quality || !isQualifiedOrganicQuality(quality.quality)) return false;

  return true;
}

export async function incrementCampaignMetric(
  env: CampaignMetricsEnv,
  ctx: QualifiedSessionContext,
  event: string,
): Promise<void> {
  const campaignId = ctx.campaignId;
  if (!campaignId) return;

  const qualified = await isQualifiedOrganicSession(env, ctx);
  const metrics = await readCampaignMetrics(env, campaignId);

  if (event === "visit") {
    metrics.totalSessions += 1;
    if (qualified) {
      metrics.qualifiedOrganicSessions += 1;
    } else {
      metrics.diagnosticSessions += 1;
    }
  }

  if (qualified) {
    const channel = ctx.channel ?? ctx.trafficSource ?? "unknown";
    if (event === "visit") {
      metrics.byChannel[channel] = (metrics.byChannel[channel] ?? 0) + 1;
    }

    switch (event) {
      case "visit":
        metrics.visits += 1;
        break;
      case "entry_click":
        metrics.entryClicks += 1;
        if (ctx.uiMode) metrics.byMode[ctx.uiMode].entryClicks += 1;
        break;
      case "marketplace_click":
        metrics.marketplaceClicks += 1;
        break;
      case "ui_mode_view":
        if (ctx.uiMode) metrics.byMode[ctx.uiMode].views += 1;
        break;
      case "service_view":
        metrics.serviceViews += 1;
        break;
      case "intake_started":
        metrics.intakeStarted += 1;
        break;
      case "intake_completed":
        metrics.intakeCompleted += 1;
        break;
      case "checkout_started":
        metrics.checkoutStarted += 1;
        break;
      case "purchase_completed":
        metrics.purchaseCompleted += 1;
        break;
      default:
        break;
    }
  }

  metrics.entryRate = safeRate(metrics.entryClicks, metrics.visits);
  metrics.marketplaceRate = safeRate(metrics.marketplaceClicks, metrics.visits);
  metrics.intakeRate = safeRate(metrics.intakeStarted, metrics.visits);
  metrics.checkoutRate = safeRate(metrics.checkoutStarted, metrics.visits);
  metrics.purchaseRate = safeRate(metrics.purchaseCompleted, metrics.visits);
  metrics.valueStatus = resolveValueStatus(metrics);

  await writeCampaignMetrics(env, metrics);

  if (qualified && ctx.channel) {
    const channelRaw = await env.TTX_STATE.get(channelMetricsKey(ctx.channel));
    const channelCount = channelRaw ? Number(channelRaw) : 0;
    await env.TTX_STATE.put(channelMetricsKey(ctx.channel), String(channelCount + 1));
  }
}

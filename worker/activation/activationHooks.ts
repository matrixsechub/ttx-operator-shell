import {
  recordSessionAttribution,
  readSessionAttribution,
} from "./attribution";
import { markSessionVisit, markSessionFunnelEvent } from "./trafficQuality";
import { incrementCampaignMetric } from "./campaignMetrics";
import { markQualifiedOrganicSession } from "./qualifiedRollup";
import type { TrafficSourceChannel } from "../trafficSources";
import type { SignalIntegrityStatus, UsageContextEnv } from "../usage";
import type { AdaptiveUiMode } from "../usageModeMetrics";

export interface ActivationHookInput {
  sessionId: string;
  event: string;
  trafficSource?: TrafficSourceChannel | null;
  campaignId?: string;
  contentId?: string;
  ctaId?: string;
  uiMode?: AdaptiveUiMode;
  signalIntegrity: SignalIntegrityStatus;
}

export async function runActivationHooks(
  env: UsageContextEnv,
  input: ActivationHookInput,
): Promise<void> {
  const source = input.trafficSource ?? null;

  if (input.event === "visit") {
    await markSessionVisit(env, input.sessionId, source);
    if (input.campaignId || source) {
      await recordSessionAttribution(env, {
        sessionId: input.sessionId,
        src: source ?? "unknown",
        campaignId: input.campaignId,
        contentId: input.contentId,
        ctaId: input.ctaId,
      });
    }
  } else {
    await markSessionFunnelEvent(env, input.sessionId, input.event);
  }

  const attribution = await readSessionAttribution(env, input.sessionId);
  const campaignId = attribution?.campaignId ?? input.campaignId;

  if (campaignId) {
    const ctx = {
      sessionId: input.sessionId,
      trafficSource: source,
      signalIntegrity: input.signalIntegrity,
      campaignId,
      channel: source ?? undefined,
      uiMode: input.uiMode,
    };
    if (input.event === "visit") {
      await markQualifiedOrganicSession(env, ctx);
    }
    await incrementCampaignMetric(env, ctx, input.event);
  }
}

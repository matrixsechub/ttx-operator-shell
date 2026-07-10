import type { AttributionTouch, SessionAttribution } from "./types";
import { attributionKey, ACTIVATION_SESSION_TTL_SECONDS } from "./kvKeys";
import { getCampaign } from "./campaignStorage";

export interface AttributionEnv {
  TTX_STATE: KVNamespace;
}

export interface AttributionInput {
  sessionId: string;
  src: string;
  campaignId?: string;
  contentId?: string;
  ctaId?: string;
}

export async function readSessionAttribution(
  env: AttributionEnv,
  sessionId: string,
): Promise<SessionAttribution | null> {
  const raw = await env.TTX_STATE.get(attributionKey(sessionId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionAttribution;
  } catch {
    return null;
  }
}

function buildTouch(input: AttributionInput): AttributionTouch {
  return {
    src: input.src,
    campaignId: input.campaignId,
    contentId: input.contentId,
    ctaId: input.ctaId,
    capturedAt: new Date().toISOString(),
  };
}

export async function recordSessionAttribution(
  env: AttributionEnv,
  input: AttributionInput,
): Promise<{ attribution: SessionAttribution; recorded: boolean; rejected: boolean; reason?: string }> {
  const existing = await readSessionAttribution(env, input.sessionId);
  const touch = buildTouch(input);
  const now = new Date().toISOString();

  if (existing) {
    const updated: SessionAttribution = {
      ...existing,
      lastTouch: touch,
      updatedAt: now,
    };
    await env.TTX_STATE.put(attributionKey(input.sessionId), JSON.stringify(updated), {
      expirationTtl: ACTIVATION_SESSION_TTL_SECONDS,
    });
    return { attribution: updated, recorded: false, rejected: false };
  }

  if (input.campaignId) {
    const campaign = await getCampaign(env, input.campaignId);
    if (!campaign || campaign.status === "ARCHIVED") {
      const rejected: SessionAttribution = {
        sessionId: input.sessionId,
        firstTouch: touch,
        rejected: true,
        rejectionReason: "attribution_rejected",
        updatedAt: now,
      };
      await env.TTX_STATE.put(attributionKey(input.sessionId), JSON.stringify(rejected), {
        expirationTtl: ACTIVATION_SESSION_TTL_SECONDS,
      });
      return { attribution: rejected, recorded: true, rejected: true, reason: "attribution_rejected" };
    }
  }

  const attribution: SessionAttribution = {
    sessionId: input.sessionId,
    firstTouch: touch,
    campaignId: input.campaignId,
    updatedAt: now,
  };

  await env.TTX_STATE.put(attributionKey(input.sessionId), JSON.stringify(attribution), {
    expirationTtl: ACTIVATION_SESSION_TTL_SECONDS,
  });

  return { attribution, recorded: true, rejected: false };
}

export function hasFirstTouchAttribution(attribution: SessionAttribution | null): boolean {
  return Boolean(attribution?.firstTouch && !attribution.rejected);
}

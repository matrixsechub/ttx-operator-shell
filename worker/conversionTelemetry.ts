import type { BuildInfoEnv } from "./buildInfo";
import type { ModeEnv } from "./mode";
import { resolveTelemetryEnvironment } from "./mode";

export type ConversionTelemetryEnv = ModeEnv &
  BuildInfoEnv & {
    TTX_STATE?: KVNamespace;
  };

export type ConversionEventName =
  | "onboarding_viewed"
  | "onboarding_cta_clicked"
  | "registration_started"
  | "registration_submitted"
  | "registration_persisted"
  | "lead_notification_requested"
  | "lead_notification_accepted"
  | "lead_notification_failed"
  | "calendly_block_viewed"
  | "calendly_booking_clicked"
  | "calendly_embed_loaded"
  | "calendly_embed_failed";

export type ConversionEventInput = {
  event: ConversionEventName;
  leadId?: string;
  sourceRoute?: string;
  ctaId?: string;
  result?: string;
  failureCode?: string;
  sessionId?: string;
};

const CONVERSION_EVENT_PREFIX = "conversion:v1:event:";
const CONVERSION_INDEX_KEY = "conversion:v1:index";
const MAX_INDEX_ENTRIES = 500;

function sanitizeRoute(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return undefined;
  return trimmed.slice(0, 160);
}

function sanitizeToken(value: unknown, max = 128): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

export async function recordConversionEvent(
  env: ConversionTelemetryEnv,
  input: ConversionEventInput,
): Promise<void> {
  if (!env.TTX_STATE) return;

  const eventId = crypto.randomUUID();
  const payload = {
    eventId,
    event: input.event,
    leadId: sanitizeToken(input.leadId, 64),
    sourceRoute: sanitizeRoute(input.sourceRoute),
    ctaId: sanitizeToken(input.ctaId, 64),
    result: sanitizeToken(input.result, 64),
    failureCode: sanitizeToken(input.failureCode, 64),
    sessionId: sanitizeToken(input.sessionId, 64),
    environment: resolveTelemetryEnvironment(env),
    deploymentSha: sanitizeToken(env.BUILD_COMMIT_SHA, 64) ?? "unknown",
    timestamp: new Date().toISOString(),
  };

  await env.TTX_STATE.put(`${CONVERSION_EVENT_PREFIX}${eventId}`, JSON.stringify(payload), {
    expirationTtl: 60 * 60 * 24 * 90,
  });

  const rawIndex = await env.TTX_STATE.get(CONVERSION_INDEX_KEY);
  let index: string[] = [];
  if (rawIndex) {
    try {
      index = JSON.parse(rawIndex) as string[];
    } catch {
      index = [];
    }
  }
  index.push(eventId);
  if (index.length > MAX_INDEX_ENTRIES) {
    index = index.slice(index.length - MAX_INDEX_ENTRIES);
  }
  await env.TTX_STATE.put(CONVERSION_INDEX_KEY, JSON.stringify(index), {
    expirationTtl: 60 * 60 * 24 * 90,
  });
}

export const CLIENT_CONVERSION_EVENTS = new Set<ConversionEventName>([
  "onboarding_viewed",
  "onboarding_cta_clicked",
  "registration_started",
  "registration_submitted",
  "calendly_block_viewed",
  "calendly_booking_clicked",
  "calendly_embed_loaded",
  "calendly_embed_failed",
]);

import type { LeadNotificationConfig } from "./publicConversionConfig";
import { summarizeReason } from "./publicConversionConfig";

export type LeadNotificationKind = "register" | "engagement";

export type LeadNotificationInput = {
  kind: LeadNotificationKind;
  leadId: string;
  correlationMarker: string;
  timestamp: string;
  sourcePage: string;
  name: string;
  email: string;
  role?: string;
  reason: string;
};

export type LeadNotificationResult =
  | { status: "accepted"; messageId: string; providerStatus: number }
  | { status: "failed"; code: string; providerStatus?: number; detail?: string }
  | { status: "skipped"; code: "LEAD_NOTIFICATION_NOT_CONFIGURED" };

const NOTIFY_IDEMPOTENCY_PREFIX = "mshops:funnel:v1:notify:";

function buildNotificationPayload(input: LeadNotificationInput, config: LeadNotificationConfig) {
  const subject =
    input.kind === "register"
      ? `MSHOPS registration lead ${input.leadId}`
      : `MSHOPS intake lead ${input.leadId}`;

  return {
    subject,
    recipient: config.recipient,
    correlation_marker: input.correlationMarker,
    lead_id: input.leadId,
    lead_kind: input.kind,
    timestamp: input.timestamp,
    source_page: input.sourcePage,
    name: input.name,
    email: input.email,
    role: input.role ?? null,
    reason_summary: summarizeReason(input.reason),
    dashboard_path: "/api/register-queue",
  };
}

export async function sendLeadNotification(
  config: LeadNotificationConfig,
  input: LeadNotificationInput,
): Promise<LeadNotificationResult> {
  const response = await fetch(config.webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(buildNotificationPayload(input, config)),
  });

  const messageId =
    response.headers.get("x-n8n-execution-id") ??
    response.headers.get("x-request-id") ??
    `provider-${response.status}`;

  if (response.ok) {
    return { status: "accepted", messageId, providerStatus: response.status };
  }

  return {
    status: "failed",
    code: response.status >= 500 ? "LEAD_NOTIFICATION_PROVIDER_ERROR" : "LEAD_NOTIFICATION_REJECTED",
    providerStatus: response.status,
    detail: `Provider responded with HTTP ${response.status}`,
  };
}

export function notifyIdempotencyKey(leadId: string): string {
  return `${NOTIFY_IDEMPOTENCY_PREFIX}${leadId}`;
}

export async function readNotificationIdempotency(
  kv: KVNamespace,
  leadId: string,
): Promise<LeadNotificationResult | null> {
  const raw = await kv.get(notifyIdempotencyKey(leadId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LeadNotificationResult;
  } catch {
    return null;
  }
}

export async function writeNotificationIdempotency(
  kv: KVNamespace,
  leadId: string,
  result: LeadNotificationResult,
): Promise<void> {
  await kv.put(notifyIdempotencyKey(leadId), JSON.stringify(result), {
    expirationTtl: 60 * 60 * 24 * 30,
  });
}

export async function deliverLeadNotification(
  kv: KVNamespace,
  config: LeadNotificationConfig | null,
  input: LeadNotificationInput,
): Promise<LeadNotificationResult> {
  const existing = await readNotificationIdempotency(kv, input.leadId);
  if (existing?.status === "accepted") {
    return existing;
  }

  if (!config) {
    const skipped: LeadNotificationResult = { status: "skipped", code: "LEAD_NOTIFICATION_NOT_CONFIGURED" };
    await writeNotificationIdempotency(kv, input.leadId, skipped);
    return skipped;
  }

  let lastResult: LeadNotificationResult | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    lastResult = await sendLeadNotification(config, input);
    if (lastResult.status === "accepted") {
      await writeNotificationIdempotency(kv, input.leadId, lastResult);
      return lastResult;
    }
    if (lastResult.status === "failed" && lastResult.code === "LEAD_NOTIFICATION_REJECTED") {
      break;
    }
  }

  const failed = lastResult ?? {
    status: "failed" as const,
    code: "LEAD_NOTIFICATION_PROVIDER_ERROR",
  };
  await writeNotificationIdempotency(kv, input.leadId, failed);
  return failed;
}

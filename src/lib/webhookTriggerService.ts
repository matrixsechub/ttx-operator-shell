import { request, type ApiResult } from "./apiClient";
import type { WebhookEvent } from "./webhookTrigger";

// Calls /api/webhooks/* through the existing Worker proxy pattern, same as
// ttxService/telemetryService. No getWebhookUrl() — the URL is just this
// origin + /api/webhooks/ingest, computable directly in the component with
// window.location.origin, not worth a round-trip. No rotateSecret() — the
// secret is a Worker secret (wrangler secret put WEBHOOK_SECRET), rotated
// via that command like every other secret in this repo, not an API call.
export const webhookTriggerService = {
  getEvents: (): Promise<ApiResult<{ events: WebhookEvent[] }>> => request("/api/webhooks/events"),

  sendTestEvent: (): Promise<ApiResult<{ ok: true; id: string }>> =>
    request("/api/webhooks/test", { method: "POST" }),
};

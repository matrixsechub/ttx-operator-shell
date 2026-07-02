import { request, type ApiResult } from "./apiClient";
import type { WebhookEvent, WebhookEventFilter } from "./webhookTrigger";

// Calls /api/webhooks/* through the existing Worker proxy pattern, same as
// ttxService/telemetryService. No getWebhookUrl() — the URL is just this
// origin + /api/webhooks/ingest, computable directly in the component with
// window.location.origin, not worth a round-trip. No rotateSecret() — the
// secret is a Worker secret (set via the CLI), rotated the same way every
// other secret in this repo is, not an API call.
export const webhookTriggerService = {
  getEvents: (filter?: WebhookEventFilter): Promise<ApiResult<{ events: WebhookEvent[] }>> => {
    const params = new URLSearchParams();
    if (filter?.source) params.set("source", filter.source);
    if (filter?.type) params.set("type", filter.type);
    const query = params.toString();
    return request(`/api/webhooks/events${query ? `?${query}` : ""}`);
  },

  sendTestEvent: (): Promise<ApiResult<{ ok: true; id: string }>> =>
    request("/api/webhooks/test", { method: "POST" }),
};

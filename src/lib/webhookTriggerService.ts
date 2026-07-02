import { request, type ApiResult } from "./apiClient";
import type { WebhookEventQuery, WebhookEventsPage } from "./webhookTrigger";

// Calls /api/webhooks/* through the existing Worker proxy pattern, same as
// ttxService/telemetryService. No getWebhookUrl() — the URL is just this
// origin + /api/webhooks/ingest, computable directly in the component with
// window.location.origin, not worth a round-trip. No rotateSecret() — the
// secret is a Worker secret (set via the CLI), rotated the same way every
// other secret in this repo is, not an API call.
//
// getEvents() keeps its existing name and gains cursor/pageSize params
// rather than being renamed to fetchEvents() — every other service method
// in this repo uses get/list/send verbs (api.getCatalog, ttxService.
// listScenarios), never "fetch"; matching that beats matching a
// one-off suggestion.
export const webhookTriggerService = {
  getEvents: (query?: WebhookEventQuery): Promise<ApiResult<WebhookEventsPage>> => {
    const params = new URLSearchParams();
    if (query?.source) params.set("source", query.source);
    if (query?.type) params.set("type", query.type);
    if (query?.cursor) params.set("cursor", query.cursor);
    if (query?.pageSize) params.set("pageSize", String(query.pageSize));
    const search = params.toString();
    return request(`/api/webhooks/events${search ? `?${search}` : ""}`);
  },

  sendTestEvent: (): Promise<ApiResult<{ ok: true; id: string }>> =>
    request("/api/webhooks/test", { method: "POST" }),

  clearEvents: (): Promise<ApiResult<{ cleared: true }>> => request("/api/webhooks/clear", { method: "POST" }),
};

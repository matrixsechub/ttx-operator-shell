import { request, type ApiResult } from "./apiClient";
import type { SecurityEventsResponse } from "./securityTypes";

// Calls /api/security/events through the existing Worker proxy pattern,
// same as webhookTriggerService/telemetryService. No pagination — the feed
// endpoint itself only ever returns the newest 20 (see worker/security.ts).
export const securityService = {
  fetchSecurityEvents: (): Promise<ApiResult<SecurityEventsResponse>> => request("/api/security/events"),
};

import { request, type ApiResult } from "./apiClient";
import type { TelemetryEvent, TelemetryStream } from "./telemetry";

// Proxy stub calling /api/telemetry/events through the existing Worker
// proxy (worker/index.ts) — same graceful-degradation pattern as
// ttxService: fails cleanly via ApiResult until the engine exposes this
// route, no separate backend wiring needed here.
export const telemetryService = {
  getEvents: (stream?: TelemetryStream): Promise<ApiResult<{ events: TelemetryEvent[] }>> =>
    request(`/api/telemetry/events${stream ? `?stream=${encodeURIComponent(stream)}` : ""}`),
};

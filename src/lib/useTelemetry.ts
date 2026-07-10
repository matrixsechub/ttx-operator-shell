import { api } from "./apiClient";
import { useApiResource } from "./useApiResource";
import { useAuth } from "./AuthContext";
import { webhookTriggerService } from "./webhookTriggerService";
import { securityService } from "./securityService";
import { ttxSessionService } from "./ttxSessionService";
import { ttxScoringService } from "./ttxScoringService";
import { getCurrentSessionId } from "./ttxSessionStorage";
import type { ApiResult } from "./apiClient";
import type { TtxSessionState } from "./ttxTypes";

const POLL_INTERVAL_MS = 30_000;

// Consolidates the signals TelemetryPanel needs into one hook. Each
// resource is fetched independently via the existing useApiResource
// polling pattern (30s, matching every other dashboard widget) so one
// failing endpoint never blocks the others — e.g. the external Engine
// call degrades gracefully today (no real Engine behind it yet) without
// affecting Worker health, version, or catalog, which are all real.
// Identity comes straight from AuthContext — it's already in memory,
// no fetch needed for that part.
//
// No api.engineStatus()/marketplaceCatalogCount() here — the former is
// just api.getSystemStatus() under a new name, the latter is a one-line
// derived value (result.data.items.length), not worth its own API
// client method. Reusing what exists, not duplicating it. Same reasoning
// applies to webhookEvents below — no new hook, just one more
// useApiResource call feeding an event count.
export function useTelemetry() {
  const workerHealth = useApiResource(api.engineHealth, { pollIntervalMs: POLL_INTERVAL_MS });
  const engineVersion = useApiResource(api.engineVersion, { pollIntervalMs: POLL_INTERVAL_MS });
  const systemState = useApiResource(api.getSystemState, { pollIntervalMs: POLL_INTERVAL_MS });
  const catalog = useApiResource(api.getCatalog, { pollIntervalMs: POLL_INTERVAL_MS });
  const webhookEvents = useApiResource(() => webhookTriggerService.getEvents(), { pollIntervalMs: POLL_INTERVAL_MS });
  // Phase 23 — one more useApiResource call feeding security event count/
  // last-event, same reasoning as webhookEvents above: no new hook needed.
  const securityEvents = useApiResource(() => securityService.fetchSecurityEvents(), {
    pollIntervalMs: POLL_INTERVAL_MS,
  });
  // Phase 25 — same reasoning as webhookEvents/securityEvents above: one
  // more useApiResource call feeding current phase / last inject, no new
  // hook needed. Sessions are per-instance now (not a global singleton
  // like Phase 24), so this reads whichever session id TTXPanel last
  // stored client-side (see ttxSessionStorage.ts) — if none, the fetcher
  // resolves to a plain "no active session" failure rather than calling
  // the Worker with an empty id.
  const ttxState = useApiResource(
    () => {
      const sessionId = getCurrentSessionId();
      return sessionId
        ? ttxSessionService.getState(sessionId)
        : Promise.resolve<ApiResult<TtxSessionState>>({ ok: false, error: "No active session" });
    },
    { pollIntervalMs: POLL_INTERVAL_MS },
  );
  // Phase 32 — same reasoning as every other resource above: one more
  // useApiResource call feeding average/last score, no new hook needed.
  const ttxScores = useApiResource(() => ttxScoringService.listScores(), { pollIntervalMs: POLL_INTERVAL_MS });
  const { operator } = useAuth();

  return {
    workerHealth,
    engineVersion,
    systemState,
    catalog,
    webhookEvents,
    securityEvents,
    ttxState,
    ttxScores,
    operator,
  };
}

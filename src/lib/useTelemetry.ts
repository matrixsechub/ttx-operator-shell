import { api } from "./apiClient";
import { useApiResource } from "./useApiResource";
import { useAuth } from "./AuthContext";
import { webhookTriggerService } from "./webhookTriggerService";

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
  const externalStatus = useApiResource(api.getSystemStatus, { pollIntervalMs: POLL_INTERVAL_MS });
  const catalog = useApiResource(api.getCatalog, { pollIntervalMs: POLL_INTERVAL_MS });
  const webhookEvents = useApiResource(() => webhookTriggerService.getEvents(), { pollIntervalMs: POLL_INTERVAL_MS });
  const { operator } = useAuth();

  return { workerHealth, engineVersion, externalStatus, catalog, webhookEvents, operator };
}

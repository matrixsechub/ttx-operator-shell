import { useMemo } from "react";
import { StatusPill } from "./StatusPill";
import { InfoCard } from "./InfoCard";
import { useApiResource } from "../lib/useApiResource";
import { securityService } from "../lib/securityService";
import type { SecurityEvent, SecurityEventType } from "../lib/securityTypes";

const POLL_INTERVAL_MS = 30_000;

const EVENT_LABEL: Record<SecurityEventType, string> = {
  auth_failed: "failed login",
  invalid_token: "invalid token",
  webhook_malformed: "malformed payload",
  webhook_signature_failed: "signature failure",
  webhook_duplicate_payload: "duplicate payload",
  webhook_burst: "source/type burst",
  webhook_spike: "event spike",
};

const EVENT_TONE: Record<SecurityEventType, "warn" | "danger"> = {
  auth_failed: "danger",
  invalid_token: "danger",
  webhook_malformed: "warn",
  webhook_signature_failed: "danger",
  webhook_duplicate_payload: "warn",
  webhook_burst: "warn",
  webhook_spike: "warn",
};

function detailSummary(event: SecurityEvent): string | null {
  if (!event.details) return null;
  const parts = Object.entries(event.details)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}: ${value}`);
  return parts.length > 0 ? parts.join(", ") : null;
}

// Operator situational awareness over signals auth.ts and webhookTrigger.ts
// already derive (Phase 23) — not a threat detection engine. Same polling/
// styling shape as WebhookTriggerPanel and TelemetryFeed: one
// useApiResource call, no new hooks.
export function SecurityPanel() {
  const { result, loading, refresh } = useApiResource(() => securityService.fetchSecurityEvents(), {
    pollIntervalMs: POLL_INTERVAL_MS,
  });

  const events = useMemo<SecurityEvent[]>(() => (result?.ok ? result.data.events : []), [result]);
  const lastEvent = events[0]; // already newest-first

  // Counts are over the currently-loaded feed (newest 20, no pagination on
  // this endpoint) — an honest "recent" count, not a full historical total.
  const counts = useMemo(() => {
    const tally = { failedLogins: 0, signatureFailures: 0, malformedPayloads: 0, invalidTokens: 0 };
    for (const event of events) {
      if (event.type === "auth_failed") tally.failedLogins += 1;
      if (event.type === "webhook_signature_failed") tally.signatureFailures += 1;
      if (event.type === "webhook_malformed") tally.malformedPayloads += 1;
      if (event.type === "invalid_token") tally.invalidTokens += 1;
    }
    return tally;
  }, [events]);

  return (
    <div id="security-panel" className="op-panel rounded-sm p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Security Signals</h2>
        <button
          type="button"
          onClick={() => refresh()}
          className="text-[10px] uppercase tracking-widest text-op-accent hover:underline"
        >
          {loading ? "syncing…" : "refresh"}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <InfoCard label="Failed Logins">
          <span className="text-sm text-op-text">{counts.failedLogins}</span>
        </InfoCard>
        <InfoCard label="Invalid Tokens">
          <span className="text-sm text-op-text">{counts.invalidTokens}</span>
        </InfoCard>
        <InfoCard label="Signature Failures">
          <span className="text-sm text-op-text">{counts.signatureFailures}</span>
        </InfoCard>
        <InfoCard label="Malformed Payloads">
          <span className="text-sm text-op-text">{counts.malformedPayloads}</span>
        </InfoCard>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <h3 className="text-[10px] uppercase tracking-widest text-op-text-dim/70">Recent Events</h3>
        {lastEvent && (
          <span className="text-[10px] text-op-text-dim">
            last anomaly: {new Date(lastEvent.timestamp).toLocaleString()}
          </span>
        )}
      </div>

      {!result || !result.ok ? (
        <p className="mt-2 text-xs italic text-op-danger">
          Security feed unavailable{result && !result.ok ? ` — ${result.error}` : ""}.
        </p>
      ) : events.length === 0 ? (
        <p className="mt-2 text-xs italic text-op-text-dim">No security signals recorded.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex flex-col gap-0.5 rounded-sm border border-op-border-bright px-2.5 py-1.5 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-op-text-dim">{new Date(event.timestamp).toLocaleString()}</span>
                <StatusPill tone={EVENT_TONE[event.type]}>{EVENT_LABEL[event.type]}</StatusPill>
              </div>
              {detailSummary(event) && <span className="text-[10px] text-op-text-dim/70">{detailSummary(event)}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

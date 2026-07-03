import { StatusPill } from "./StatusPill";
import { InfoCard } from "./InfoCard";
import { useTelemetry } from "../lib/useTelemetry";

// Single-glance consolidation of signals that otherwise live on separate
// pages/widgets (EngineStatusIndicator, Status.tsx, Marketplace.tsx) — this
// doesn't replace any of those, it's a summary view. Every section renders
// from its own resource's state independently, so one failing endpoint
// (the external Engine call degrades gracefully today) never blanks the
// rest of the panel.
export function TelemetryPanel() {
  const { workerHealth, engineVersion, externalStatus, catalog, webhookEvents, securityEvents, ttxState, operator } =
    useTelemetry();

  const workerOnline = workerHealth.result?.ok && workerHealth.result.data.status === "ok";
  const versionLabel = engineVersion.result?.ok ? `v${engineVersion.result.data.version}` : "unknown";
  const itemCount = catalog.result?.ok ? catalog.result.data.items.length : null;

  // .total (all matching events), not .events.length (capped at page size,
  // 20 by default since Phase 22) — the accurate count for this summary.
  const webhookEventTotal = webhookEvents.result?.ok ? webhookEvents.result.data.total : null;
  const recentEvents = webhookEvents.result?.ok ? webhookEvents.result.data.events : [];
  const lastEvent = recentEvents[0]; // already newest-first
  // Simple, honest rate over whatever's in the current (already newest-
  // first, up-to-page-size) fetch — not a true continuous-stream rate,
  // just "how many of the events we can currently see arrived in the last
  // 60s". Good enough for an at-a-glance cockpit signal.
  const oneMinuteAgo = Date.now() - 60_000;
  const eventsPerMinute = recentEvents.filter((event) => new Date(event.receivedAt).getTime() >= oneMinuteAgo).length;

  // Phase 23 — security feed has no .total (no pagination on that endpoint,
  // see worker/security.ts), so the count is the currently-loaded feed
  // length (already capped at 20 server-side), not a distinct "recent vs
  // all" split like webhook events above.
  const securityEventCount = securityEvents.result?.ok ? securityEvents.result.data.events.length : null;
  const lastSecurityEvent = securityEvents.result?.ok ? securityEvents.result.data.events[0] : undefined;
  const lastSecurityEventType = lastSecurityEvent?.type;

  // Phase 24
  // Phase 25 — getState() resolves to a plain ok:false when no session id
  // is stored client-side (see useTelemetry.ts), so "not started" and a
  // genuine backend error both come through as !ok. Distinguish them by
  // that specific message rather than adding a second signal.
  const ttxCurrentPhase = ttxState.result?.ok ? ttxState.result.data : null;
  const ttxNotStarted = ttxState.result?.ok === false && ttxState.result.error === "No active session";
  const ttxLastInject = ttxCurrentPhase?.inject ?? null;

  return (
    <div id="telemetry-panel" className="op-panel rounded-sm p-4">
      <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Telemetry</h2>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InfoCard label="Worker">
          <div className="flex items-center justify-between">
            <StatusPill tone={!workerHealth.result ? "neutral" : workerOnline ? "ok" : "danger"}>
              {!workerHealth.result ? "checking…" : workerOnline ? "Online" : "Unknown"}
            </StatusPill>
            <span className="text-xs text-op-text-dim">{versionLabel}</span>
          </div>
        </InfoCard>

        <InfoCard label="External Engine">
          {!externalStatus.result ? (
            <span className="text-xs italic text-op-text-dim">checking…</span>
          ) : !externalStatus.result.ok ? (
            <span className="text-xs italic text-op-text-dim">unreachable — {externalStatus.result.error}</span>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs text-op-text">
                {externalStatus.result.data.harness?.detail ?? "No detail reported"}
              </span>
              <StatusPill tone={externalStatus.result.data.harness?.state === "online" ? "ok" : "warn"}>
                {externalStatus.result.data.harness?.state ?? "unknown"}
              </StatusPill>
            </div>
          )}
        </InfoCard>

        <InfoCard label="Operator Identity">
          {operator ? (
            <div className="flex flex-col gap-0.5 text-xs">
              <span className="text-op-text">{operator.handle}</span>
              {operator.role && <span className="text-op-text-dim">role: {operator.role}</span>}
              {operator.access_level && <span className="text-op-text-dim">access: {operator.access_level}</span>}
            </div>
          ) : (
            <span className="text-xs italic text-op-text-dim">no operator identity</span>
          )}
        </InfoCard>

        <InfoCard label="Marketplace">
          {!catalog.result ? (
            <span className="text-xs italic text-op-text-dim">checking…</span>
          ) : !catalog.result.ok ? (
            <span className="text-xs italic text-op-text-dim">unavailable — {catalog.result.error}</span>
          ) : (
            <span className="text-xs text-op-text">{itemCount} items available</span>
          )}
        </InfoCard>

        <InfoCard label="Webhook Events">
          {!webhookEvents.result ? (
            <span className="text-xs italic text-op-text-dim">checking…</span>
          ) : !webhookEvents.result.ok ? (
            <span className="text-xs italic text-op-text-dim">unavailable — {webhookEvents.result.error}</span>
          ) : (
            <div className="flex flex-col gap-0.5 text-xs">
              <span className="text-op-text">
                {webhookEventTotal} events received
                {eventsPerMinute > 0 && <span className="text-op-text-dim"> · {eventsPerMinute}/min recent</span>}
              </span>
              {lastEvent && (
                <span className="text-op-text-dim">
                  last: {lastEvent.source ?? "unknown"}
                  {lastEvent.type && ` / ${lastEvent.type}`}
                </span>
              )}
            </div>
          )}
        </InfoCard>

        <InfoCard label="Security Signals">
          {!securityEvents.result ? (
            <span className="text-xs italic text-op-text-dim">checking…</span>
          ) : !securityEvents.result.ok ? (
            <span className="text-xs italic text-op-text-dim">unavailable — {securityEvents.result.error}</span>
          ) : (
            <div className="flex flex-col gap-0.5 text-xs">
              <span className="text-op-text">{securityEventCount} recent events</span>
              {lastSecurityEvent && (
                <span className="text-op-text-dim">
                  last: {lastSecurityEventType} at {new Date(lastSecurityEvent.timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
          )}
        </InfoCard>

        <InfoCard label="TTX Scenario">
          {!ttxState.result ? (
            <span className="text-xs italic text-op-text-dim">checking…</span>
          ) : ttxNotStarted ? (
            <span className="text-xs italic text-op-text-dim">not started</span>
          ) : !ttxState.result.ok ? (
            <span className="text-xs italic text-op-text-dim">unavailable — {ttxState.result.error}</span>
          ) : !ttxCurrentPhase ? (
            <span className="text-xs italic text-op-text-dim">not started</span>
          ) : ttxCurrentPhase.done ? (
            <span className="text-xs text-op-accent">complete</span>
          ) : (
            <div className="flex flex-col gap-0.5 text-xs">
              <span className="text-op-text">
                {ttxCurrentPhase.scenarioTitle} ({ttxCurrentPhase.scenarioSource}) — {ttxCurrentPhase.title}
              </span>
              {ttxLastInject && <span className="text-op-text-dim">{ttxLastInject}</span>}
            </div>
          )}
        </InfoCard>
      </div>
    </div>
  );
}

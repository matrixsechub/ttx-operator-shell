import { useMemo, useState } from "react";
import { InfoCard } from "../../components/InfoCard";
import { useApiResource } from "../../lib/useApiResource";
import { webhookTriggerService } from "../../lib/webhookTriggerService";
import type { WebhookEvent } from "../../lib/webhookTrigger";

const POLL_INTERVAL_MS = 30_000;
const PREVIEW_LENGTH = 60;

function payloadPreview(payload: unknown): string {
  const text = JSON.stringify(payload);
  if (!text) return "";
  return text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH)}…` : text;
}

// Receives external webhook POSTs (worker/webhookTrigger.ts, HMAC-signed,
// no operator auth involved — the signature IS the auth for that route)
// and shows them here. The secret itself is never fetched or displayed —
// it's a write-only Worker secret, same as AUTH_SIGNING_KEY. Set it via
// the CLI (see README).
//
// Fetches the full (capped at 50) event list once via the existing
// useApiResource polling pattern and filters by source/type client-side —
// webhookTriggerService.getEvents() does support server-side filter
// params, but at this scale (≤50 events) re-fetching on every filter
// change would be more complexity for no real benefit.
export function WebhookTriggerPanel() {
  const { result, loading, refresh } = useApiResource(() => webhookTriggerService.getEvents(), {
    pollIntervalMs: POLL_INTERVAL_MS,
  });
  const [sendingTest, setSendingTest] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const allEvents = useMemo<WebhookEvent[]>(() => (result?.ok ? result.data.events : []), [result]);
  const sources = useMemo(
    () => Array.from(new Set(allEvents.map((event) => event.source).filter((value): value is string => !!value))),
    [allEvents],
  );
  const types = useMemo(
    () => Array.from(new Set(allEvents.map((event) => event.type).filter((value): value is string => !!value))),
    [allEvents],
  );
  const events = allEvents.filter(
    (event) => (!sourceFilter || event.source === sourceFilter) && (!typeFilter || event.type === typeFilter),
  );

  const webhookUrl =
    typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/ingest` : "/api/webhooks/ingest";

  async function handleSendTest() {
    setSendingTest(true);
    await webhookTriggerService.sendTestEvent();
    await refresh();
    setSendingTest(false);
  }

  return (
    <div id="webhook-trigger-panel" className="op-panel rounded-sm p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Webhook Trigger</h2>
        <button
          type="button"
          onClick={() => refresh()}
          className="text-[10px] uppercase tracking-widest text-op-accent hover:underline"
        >
          {loading ? "syncing…" : "refresh"}
        </button>
      </div>

      <InfoCard label="Webhook URL" className="mt-3">
        <code className="break-all text-[11px] text-op-text">{webhookUrl}</code>
        <p className="mt-1 text-[10px] italic text-op-text-dim">
          Sign requests with HMAC-SHA256 (hex) in an X-Webhook-Signature header, using the WEBHOOK_SECRET Worker
          secret. The secret is never shown here.
        </p>
      </InfoCard>

      <button
        type="button"
        disabled={sendingTest}
        onClick={handleSendTest}
        className="mt-3 rounded-sm border border-op-border-bright px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-text-dim transition-colors hover:border-op-accent/50 hover:text-op-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sendingTest ? "sending…" : "Send Test Event"}
      </button>

      <div className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[10px] uppercase tracking-widest text-op-text-dim/70">Event Feed</h3>
          {(sources.length > 0 || types.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {sources.length > 0 && (
                <select
                  value={sourceFilter}
                  onChange={(event) => setSourceFilter(event.target.value)}
                  className="op-panel rounded-sm px-1.5 py-0.5 text-[10px] text-op-text focus:border-op-accent/60 focus:outline-none"
                >
                  <option value="">All sources</option>
                  {sources.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              )}
              {types.length > 0 && (
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="op-panel rounded-sm px-1.5 py-0.5 text-[10px] text-op-text focus:border-op-accent/60 focus:outline-none"
                >
                  <option value="">All types</option>
                  {types.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {!result || !result.ok ? (
          <p className="mt-2 text-xs italic text-op-danger">
            Event feed unavailable{result && !result.ok ? ` — ${result.error}` : ""}.
          </p>
        ) : allEvents.length === 0 ? (
          <p className="mt-2 text-xs italic text-op-text-dim">No webhook events received yet.</p>
        ) : events.length === 0 ? (
          <p className="mt-2 text-xs italic text-op-text-dim">No events match the current filter.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {events.map((event) => {
              const expanded = expandedId === event.id;
              return (
                <li key={event.id} className="rounded-sm border border-op-border-bright">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : event.id)}
                    className="flex w-full flex-col gap-0.5 px-2.5 py-1.5 text-left text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-op-text-dim">{new Date(event.receivedAt).toLocaleString()}</span>
                      <span className="text-op-text-dim/60">{expanded ? "▲" : "▼"}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {event.source && (
                        <span className="rounded-sm border border-op-border-bright px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-op-text-dim">
                          {event.source}
                        </span>
                      )}
                      {event.type && (
                        <span className="rounded-sm border border-op-accent-2/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-op-accent-2">
                          {event.type}
                        </span>
                      )}
                      {event.test && (
                        <span className="rounded-sm border border-op-amber/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-op-amber">
                          test
                        </span>
                      )}
                      {!expanded && (
                        <span className="truncate text-[10px] text-op-text-dim/70">{payloadPreview(event.payload)}</span>
                      )}
                    </div>
                  </button>
                  {expanded && (
                    <pre className="op-scrollbar max-h-48 overflow-auto border-t border-op-border bg-black/20 p-2 text-[10px] text-op-text-dim">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

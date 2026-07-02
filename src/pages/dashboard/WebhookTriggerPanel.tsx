import { useEffect, useMemo, useState } from "react";
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
// it's a write-only Worker secret, same as AUTH_SIGNING_KEY.
//
// Pagination model: useApiResource keeps "page 1" live via the existing
// 30s poll (matching every other widget). "Load more" pages are held in
// separate local state so a poll tick can't wipe accumulated progress —
// see the effect below for exactly when each is in control. Retention
// caps the server-side total at 50, so pagination only ever spans a
// handful of pages.
export function WebhookTriggerPanel() {
  const [sourceFilter, setSourceFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const { result, loading, refresh } = useApiResource(
    () => webhookTriggerService.getEvents({ source: sourceFilter || undefined, type: typeFilter || undefined }),
    { pollIntervalMs: POLL_INTERVAL_MS },
  );

  const [olderEvents, setOlderEvents] = useState<WebhookEvent[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const page1Events = useMemo<WebhookEvent[]>(() => (result?.ok ? result.data.events : []), [result]);
  const total = result?.ok ? result.data.total : 0;

  // While no "Load more" has happened yet, keep cursor in sync with the
  // live-polled page 1's nextCursor. Once olderEvents is non-empty, this
  // stops — otherwise a 30s poll would silently reset cursor back to
  // "right after page 1" and undo whatever the operator had loaded.
  useEffect(() => {
    if (olderEvents.length === 0 && result?.ok) {
      setCursor(result.data.nextCursor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // Filter change: drop accumulated pages and re-fetch page 1 under the
  // new filter. Also fires once on mount (harmless, same accepted
  // redundant-first-fetch tradeoff as the TTX module's injects/timeline).
  useEffect(() => {
    setOlderEvents([]);
    setCursor(undefined);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceFilter, typeFilter]);

  // De-duped, order-preserving merge — page 1 (newest) first, then
  // whatever's been loaded via "Load more". A Map guards against the rare
  // case where a poll-refreshed page 1 overlaps the boundary of an
  // already-loaded older page.
  const events = useMemo(() => {
    const map = new Map<string, WebhookEvent>();
    for (const event of page1Events) map.set(event.id, event);
    for (const event of olderEvents) if (!map.has(event.id)) map.set(event.id, event);
    return Array.from(map.values());
  }, [page1Events, olderEvents]);

  const sources = useMemo(
    () => Array.from(new Set(events.map((event) => event.source).filter((value): value is string => !!value))),
    [events],
  );
  const types = useMemo(
    () => Array.from(new Set(events.map((event) => event.type).filter((value): value is string => !!value))),
    [events],
  );

  const webhookUrl =
    typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/ingest` : "/api/webhooks/ingest";

  async function handleSendTest() {
    setSendingTest(true);
    await webhookTriggerService.sendTestEvent();
    await refresh();
    setSendingTest(false);
  }

  async function handleLoadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    const response = await webhookTriggerService.getEvents({
      source: sourceFilter || undefined,
      type: typeFilter || undefined,
      cursor,
    });
    if (response.ok) {
      setOlderEvents((prev) => [...prev, ...response.data.events]);
      setCursor(response.data.nextCursor);
    }
    setLoadingMore(false);
  }

  async function handleClear() {
    setClearing(true);
    const response = await webhookTriggerService.clearEvents();
    if (response.ok) {
      setOlderEvents([]);
      setCursor(undefined);
      await refresh();
    }
    setClearing(false);
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

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={sendingTest}
          onClick={handleSendTest}
          className="rounded-sm border border-op-border-bright px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-text-dim transition-colors hover:border-op-accent/50 hover:text-op-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sendingTest ? "sending…" : "Send Test Event"}
        </button>
        <button
          type="button"
          disabled={clearing || total === 0}
          onClick={handleClear}
          className="rounded-sm border border-op-border-bright px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-text-dim transition-colors hover:border-op-danger/50 hover:text-op-danger disabled:cursor-not-allowed disabled:opacity-50"
        >
          {clearing ? "clearing…" : "Clear Events"}
        </button>
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[10px] uppercase tracking-widest text-op-text-dim/70">
            Event Feed
            {total > 0 && (
              <span className="ml-1.5 normal-case tracking-normal text-op-text-dim/60">
                — showing {events.length} of {total}
              </span>
            )}
          </h3>
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
        ) : total === 0 ? (
          <p className="mt-2 text-xs italic text-op-text-dim">No webhook events received yet.</p>
        ) : events.length === 0 ? (
          <p className="mt-2 text-xs italic text-op-text-dim">No events match the current filter.</p>
        ) : (
          <>
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
                          <span className="truncate text-[10px] text-op-text-dim/70">
                            {payloadPreview(event.payload)}
                          </span>
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

            {cursor && (
              <button
                type="button"
                disabled={loadingMore}
                onClick={handleLoadMore}
                className="mt-2 w-full rounded-sm border border-op-border-bright py-1.5 text-[10px] uppercase tracking-widest text-op-text-dim transition-colors hover:border-op-accent/50 hover:text-op-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingMore ? "loading…" : "Load More"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

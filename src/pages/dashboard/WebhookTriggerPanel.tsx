import { useState } from "react";
import { InfoCard } from "../../components/InfoCard";
import { useApiResource } from "../../lib/useApiResource";
import { webhookTriggerService } from "../../lib/webhookTriggerService";

const POLL_INTERVAL_MS = 30_000;

// Receives external webhook POSTs (worker/webhookTrigger.ts, HMAC-signed,
// no operator auth involved — the signature IS the auth for that route)
// and shows them here. The secret itself is never fetched or displayed —
// it's a write-only Worker secret, same as AUTH_SIGNING_KEY. Set it with:
//   wrangler secret put WEBHOOK_SECRET
export function WebhookTriggerPanel() {
  const { result, loading, refresh } = useApiResource(webhookTriggerService.getEvents, {
    pollIntervalMs: POLL_INTERVAL_MS,
  });
  const [sendingTest, setSendingTest] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const events = result?.ok ? result.data.events : [];
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
          Sign requests with HMAC-SHA256 (hex) in an X-Webhook-Signature header, using the secret set via{" "}
          <code>wrangler secret put WEBHOOK_SECRET</code>. The secret is never shown here.
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
        <h3 className="text-[10px] uppercase tracking-widest text-op-text-dim/70">Event Feed</h3>

        {!result || !result.ok ? (
          <p className="mt-2 text-xs italic text-op-text-dim">
            Event feed unavailable{result && !result.ok ? ` — ${result.error}` : ""}.
          </p>
        ) : events.length === 0 ? (
          <p className="mt-2 text-xs italic text-op-text-dim">No events received yet.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {events.map((event) => {
              const expanded = expandedId === event.id;
              return (
                <li key={event.id} className="rounded-sm border border-op-border-bright">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : event.id)}
                    className="flex w-full items-center justify-between px-2.5 py-1.5 text-left text-xs"
                  >
                    <span className="text-op-text-dim">
                      {new Date(event.receivedAt).toLocaleString()}
                      {event.test && <span className="ml-1.5 text-op-accent-2">test</span>}
                    </span>
                    <span className="text-op-text-dim/60">{expanded ? "▲" : "▼"}</span>
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

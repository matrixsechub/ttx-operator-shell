import { useState } from "react";
import type { IntentCaptureContext } from "../lib/useIntentCaptureTrigger";
import { useIntentCaptureTrigger } from "../lib/useIntentCaptureTrigger";

interface IntentCapturePreview {
  problemSummary: string;
  suggestedSystemType: string;
  implementationPath: string;
  riskTrustNote: string;
  nextAction: string;
  builderRoute: string;
}

interface IntentCaptureHandoff {
  unlockBlueprint: string;
  bookImplementation: string;
  exploreMarketplaceModule: string;
  requestServiceFulfillment: string;
}

async function recordHandoff(event: string, sessionId: string): Promise<void> {
  await fetch("/api/growth/intent-handoff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, sessionId }),
  }).catch(() => {
    // Best-effort.
  });
}

export function IntentCaptureBlock({ page }: { page: string }) {
  const { visible, dismiss, getContext } = useIntentCaptureTrigger(page);
  const [intent, setIntent] = useState("");
  const [category, setCategory] = useState("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<IntentCapturePreview | null>(null);
  const [handoff, setHandoff] = useState<IntentCaptureHandoff | null>(null);

  if (!visible) return null;

  async function submitCapture(context: IntentCaptureContext) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/growth/intent-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...context,
          intent,
          category,
          timestamp: new Date().toISOString(),
        }),
      });
      if (!response.ok) {
        throw new Error(`Capture failed (${response.status})`);
      }
      const payload = await response.json();
      setPreview(payload.preview ?? null);
      setHandoff(payload.handoff ?? null);
      await recordHandoff("preview_generated", context.sessionId);
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : "Capture failed");
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    void recordHandoff("preview_abandoned", getContext().sessionId);
    dismiss();
  }

  return (
    <section
      id="intent-capture-block"
      className="fixed bottom-4 right-4 z-50 w-[min(100%,24rem)] rounded-sm border border-op-accent/40 bg-op-panel p-4 shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-xs uppercase tracking-widest text-op-accent">What are you trying to build?</h2>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-[10px] uppercase tracking-widest text-op-text-dim hover:text-op-text"
        >
          close
        </button>
      </div>

      {!preview ? (
        <div className="mt-3 flex flex-col gap-3">
          <textarea
            value={intent}
            onChange={(event) => setIntent(event.target.value)}
            rows={4}
            placeholder="Describe the system, workflow, or outcome you want..."
            className="w-full rounded-sm border border-op-border bg-op-bg px-3 py-2 text-xs text-op-text outline-none focus:border-op-accent/60"
          />
          <label className="flex flex-col gap-1 text-[11px] text-op-text-dim">
            Category (optional)
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-sm border border-op-border bg-op-bg px-2 py-1.5 text-xs text-op-text"
            >
              <option value="general">General</option>
              <option value="ai_agent">AI agent</option>
              <option value="automation">Automation</option>
              <option value="security_audit">Security audit</option>
              <option value="marketplace_module">Marketplace module</option>
            </select>
          </label>
          {error ? <p className="text-[11px] italic text-op-danger">{error}</p> : null}
          <button
            type="button"
            disabled={loading || intent.trim().length < 3}
            onClick={() => void submitCapture(getContext())}
            className="rounded-sm border border-op-accent/60 px-3 py-2 text-[11px] uppercase tracking-widest text-op-accent disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate My System"}
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2 text-xs text-op-text-dim">
          <p className="text-op-text">{preview.problemSummary}</p>
          <p>
            <span className="text-op-text">System:</span> {preview.suggestedSystemType}
          </p>
          <p>
            <span className="text-op-text">Path:</span> {preview.implementationPath}
          </p>
          <p className="italic">{preview.riskTrustNote}</p>
          <p className="text-op-text">{preview.nextAction}</p>
          {handoff ? (
            <div className="mt-2 flex flex-col gap-1.5">
              <a
                href={handoff.unlockBlueprint}
                onClick={() => void recordHandoff("unlock_clicked", getContext().sessionId)}
                className="text-[11px] uppercase tracking-widest text-op-accent hover:underline"
              >
                Unlock full blueprint
              </a>
              <a
                href={handoff.bookImplementation}
                onClick={() => void recordHandoff("booking_clicked", getContext().sessionId)}
                className="text-[11px] uppercase tracking-widest text-op-accent hover:underline"
              >
                Book implementation
              </a>
              <a
                href={handoff.exploreMarketplaceModule}
                onClick={() => void recordHandoff("module_clicked", getContext().sessionId)}
                className="text-[11px] uppercase tracking-widest text-op-accent hover:underline"
              >
                Explore matching marketplace module
              </a>
              <a
                href={handoff.requestServiceFulfillment}
                className="text-[11px] uppercase tracking-widest text-op-text-dim hover:text-op-text"
              >
                Request service-assisted fulfillment
              </a>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

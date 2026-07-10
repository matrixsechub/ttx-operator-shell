import { StatusPill } from "../../components/StatusPill";
import { intentCaptureService } from "../../lib/intentCaptureService";
import { useApiResource } from "../../lib/useApiResource";

function stateTone(state: string | undefined): "ok" | "warn" | "neutral" {
  if (state === "CAPTURING_DEMAND") return "ok";
  return "neutral";
}

export function IntentCapturePanel() {
  const { result, loading } = useApiResource(intentCaptureService.getReport, { pollIntervalMs: 30_000 });
  const data = result?.ok ? result.data : null;

  return (
    <div id="intent-capture-panel" className="op-panel rounded-sm p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Intent Capture</h2>
        <StatusPill tone={!data ? "neutral" : stateTone(data.systemState)}>
          {loading ? "syncing" : data?.systemState ?? "unknown"}
        </StatusPill>
      </div>

      {!result || !result.ok ? (
        <p className="mt-3 text-xs italic text-op-text-dim">
          Intent capture unavailable{result && !result.ok ? ` — ${result.error}` : ""}.
        </p>
      ) : result.ok ? (
        <ul className="mt-3 flex flex-col gap-2 text-xs text-op-text-dim">
          <li>
            <span className="text-op-text">Captured intents:</span> {result.data.topCapturedIntents.length}
          </li>
          <li>
            <span className="text-op-text">Top source:</span> {result.data.topSources[0]?.source ?? "—"}
          </li>
          <li>
            <span className="text-op-text">Intent rate:</span> {Math.round(result.data.intentRate * 100)}%
          </li>
          <li>
            <span className="text-op-text">Preview rate:</span> {Math.round(result.data.previewGenerationRate * 100)}%
          </li>
          <li>
            <span className="text-op-text">Handoff rate:</span> {Math.round(result.data.handoffRate * 100)}%
          </li>
          <li>
            <span className="text-op-text">Top page:</span> {result.data.topIntentPages[0]?.page ?? "—"}
          </li>
          {result.data.topCapturedIntents[0] ? (
            <li>
              <span className="text-op-text">Latest intent:</span> {result.data.topCapturedIntents[0].text}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

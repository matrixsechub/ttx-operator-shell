import { StatusPill } from "../../components/StatusPill";
import { flowIntelligenceService } from "../../lib/flowIntelligenceService";
import { useApiResource } from "../../lib/useApiResource";

function systemTone(state: string | undefined): "ok" | "warn" | "neutral" {
  if (state === "OPTIMIZING") return "ok";
  if (state === "ANALYZING") return "warn";
  return "neutral";
}

export function FlowIntelligencePanel() {
  const { result, loading } = useApiResource(flowIntelligenceService.getReport, { pollIntervalMs: 30_000 });
  const data = result?.ok ? result.data : null;
  const trend = data?.trend;
  const confidence = data?.confidence;

  const strongestFlow = data?.topPaths[0];
  const worstFriction = data?.frictionPoints[0];
  const topRecommendation = data?.recommendations[0];

  return (
    <div id="flow-intelligence-panel" className="op-panel rounded-sm p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Flow Intelligence</h2>
        <StatusPill tone={!data ? "neutral" : systemTone(data.systemState)}>
          {loading ? "syncing" : data?.systemState ?? "unknown"}
        </StatusPill>
      </div>

      {!result || !result.ok ? (
        <p className="mt-3 text-xs italic text-op-text-dim">
          Flow intelligence unavailable{result && !result.ok ? ` — ${result.error}` : ""}.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2 text-xs text-op-text-dim">
          <li>
            <span className="text-op-text">Strongest flow:</span>{" "}
            {strongestFlow ? strongestFlow.path.join(" → ") : "—"}
          </li>
          <li>
            <span className="text-op-text">Worst friction:</span>{" "}
            {worstFriction ? `${worstFriction.page} (${worstFriction.ruleId.replace(/_/g, " ")})` : "—"}
          </li>
          <li>
            <span className="text-op-text">Top recommendation:</span>{" "}
            {topRecommendation?.suggestedChange ?? "—"}
          </li>
          <li>
            <span className="text-op-text">Trend:</span>{" "}
            {trend && (
              <>
                {trend.sessionsDelta >= 0 ? "+" : ""}
                {trend.sessionsDelta} sessions, friction delta {trend.topFrictionDelta} ({trend.period})
              </>
            )}
          </li>
          <li>
            <span className="text-op-text">Confidence:</span> {confidence ?? "—"}
          </li>
        </ul>
      )}
    </div>
  );
}

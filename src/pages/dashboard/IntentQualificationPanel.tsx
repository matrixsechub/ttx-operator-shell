import { StatusPill } from "../../components/StatusPill";
import { intentQualificationService } from "../../lib/intentQualificationService";
import { useApiResource } from "../../lib/useApiResource";

function stateTone(state: string | undefined): "ok" | "warn" | "neutral" {
  if (state === "QUALIFIED_PIPELINE") return "ok";
  if (state === "QUALIFYING") return "warn";
  return "neutral";
}

export function IntentQualificationPanel() {
  const { result, loading } = useApiResource(intentQualificationService.getReport, {
    pollIntervalMs: 30_000,
  });
  const data = result?.ok ? result.data : null;

  return (
    <div id="intent-qualification-panel" className="op-panel rounded-sm p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Intent Qualification</h2>
        <StatusPill tone={!data ? "neutral" : stateTone(data.systemState)}>
          {loading ? "syncing" : data?.systemState ?? "unknown"}
        </StatusPill>
      </div>

      {!result || !result.ok ? (
        <p className="mt-3 text-xs italic text-op-text-dim">
          Intent qualification unavailable{result && !result.ok ? ` — ${result.error}` : ""}.
        </p>
      ) : result.ok ? (
        <ul className="mt-3 flex flex-col gap-2 text-xs text-op-text-dim">
          <li>
            <span className="text-op-text">Qualified intents:</span> {result.data.qualifiedTotal}
          </li>
          <li>
            <span className="text-op-text">High priority:</span> {result.data.countsByPriority.high ?? 0}
          </li>
          <li>
            <span className="text-op-text">Top type:</span>{" "}
            {Object.entries(result.data.countsByType).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"}
          </li>
          <li>
            <span className="text-op-text">Top source:</span> {result.data.topSources[0]?.source ?? "—"}
          </li>
          <li>
            <span className="text-op-text">Top route:</span>{" "}
            {result.data.topRoutes[0]?.route.split("?")[0] ?? "—"}
          </li>
          <li>
            <span className="text-op-text">Top offer:</span> {result.data.topRecommendedOffers[0]?.offer ?? "—"}
          </li>
          {result.data.topQualifiedIntents[0] ? (
            <li>
              <span className="text-op-text">Highest score:</span> {result.data.topQualifiedIntents[0].totalScore}{" "}
              — {result.data.topQualifiedIntents[0].intentSummary.slice(0, 48)}
            </li>
          ) : null}
          {result.data.advisoryProposals[0] ? (
            <li>
              <span className="text-op-text">Advisory:</span> {result.data.advisoryProposals[0].type}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

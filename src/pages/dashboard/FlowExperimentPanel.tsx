import { StatusPill } from "../../components/StatusPill";
import { flowExperimentService } from "../../lib/flowExperimentService";
import { useApiResource } from "../../lib/useApiResource";

function statusTone(status: string | undefined): "ok" | "warn" | "danger" | "neutral" {
  if (status === "WINNING") return "ok";
  if (status === "RUNNING") return "warn";
  if (status === "LOSING") return "danger";
  return "neutral";
}

function intentRate(metrics: { views: number; intentSubmissions: number }): string {
  if (metrics.views <= 0) return "0%";
  return `${Math.round((metrics.intentSubmissions / metrics.views) * 100)}%`;
}

export function FlowExperimentPanel() {
  const { result, loading } = useApiResource(flowExperimentService.getReport, { pollIntervalMs: 30_000 });
  const data = result?.ok ? result.data : null;
  const experiment = data?.activeExperiment;
  const outcome = data?.outcome;
  const status = outcome?.status ?? "INCONCLUSIVE";

  return (
    <div id="flow-experiment-panel" className="op-panel rounded-sm p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Flow Experiment</h2>
        <StatusPill tone={!data ? "neutral" : statusTone(status)}>
          {loading ? "syncing" : status}
        </StatusPill>
      </div>

      {!result || !result.ok ? (
        <p className="mt-3 text-xs italic text-op-text-dim">
          Flow experiment unavailable{result && !result.ok ? ` — ${result.error}` : ""}.
        </p>
      ) : !experiment || !outcome ? (
        <p className="mt-3 text-xs text-op-text-dim">No active experiment — awaiting flow intelligence signal.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2 text-xs text-op-text-dim">
          <li>
            <span className="text-op-text">Active experiment:</span> {experiment.id}
          </li>
          <li>
            <span className="text-op-text">Page:</span> {experiment.page}
          </li>
          <li>
            <span className="text-op-text">Issue:</span> {experiment.issue.replace(/_/g, " ")}
          </li>
          <li>
            <span className="text-op-text">Baseline (A):</span> intent {intentRate(outcome.variantA)} —{" "}
            {outcome.variantA.views} views
          </li>
          <li>
            <span className="text-op-text">Variant (B):</span> intent {intentRate(outcome.variantB)} —{" "}
            {outcome.variantB.views} views
          </li>
          {outcome.promotionProposal && (
            <li>
              <span className="text-op-text">Proposal:</span> {outcome.promotionProposal}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

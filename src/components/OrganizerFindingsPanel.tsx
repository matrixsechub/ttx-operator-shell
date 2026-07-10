import { StatusPill } from "./StatusPill";
import { useApiResource } from "../lib/useApiResource";
import { operatorDashboardService } from "../lib/operatorDashboardService";

function toneForSeverity(severity: string): "ok" | "warn" | "danger" | "neutral" {
  if (severity === "error") return "danger";
  if (severity === "warn") return "warn";
  return "neutral";
}

export function OrganizerFindingsPanel() {
  const { result, loading, refresh } = useApiResource(operatorDashboardService.getOrganizerReport, {
    pollIntervalMs: 60_000,
  });

  const report = result?.ok && result.data.available ? result.data.report : null;

  return (
    <div id="organizer-findings-panel" className="op-panel rounded-sm p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs uppercase tracking-widest text-op-text-dim">OrganizerAgent findings</h2>
          <p className="mt-1 text-[11px] text-op-text-dim">Advisory structural scan — no autonomous refactors.</p>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          className="rounded-sm border border-op-border-bright px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-text-dim hover:border-op-accent/50"
        >
          {loading ? "syncing…" : "refresh"}
        </button>
      </div>

      {!result ? (
        <p className="mt-4 text-xs text-op-text-dim">Loading organizer report…</p>
      ) : !result.ok ? (
        <p className="mt-4 text-xs text-op-danger">{result.error}</p>
      ) : !result.data.available ? (
        <div className="mt-4 text-xs text-op-text-dim">
          <p>No report published to KV.</p>
          <p className="mt-2">{result.data.hint}</p>
        </div>
      ) : report ? (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap gap-4 text-xs">
            <span>Scanned {new Date(report.scannedAt).toLocaleString()}</span>
            <span className="text-op-text-dim">
              {report.summary.errorCount} errors · {report.summary.warnCount} warns ·{" "}
              {report.summary.suggestionCount} suggestions
            </span>
          </div>

          {report.issues.length === 0 ? (
            <p className="text-xs text-op-text-dim">No structural issues in latest scan.</p>
          ) : (
            <ul className="space-y-2">
              {report.issues.slice(0, 20).map((issue, index) => (
                <li key={`${issue.ruleId}-${issue.relativePath}`} className="rounded-sm border border-op-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] text-op-accent">ORG-{index + 1}</span>
                    <StatusPill tone={toneForSeverity(issue.severity)}>{issue.severity}</StatusPill>
                    <span className="text-[10px] text-op-text-dim">{issue.ruleId}</span>
                  </div>
                  <p className="mt-2 text-xs text-op-text">{issue.message}</p>
                  <p className="mt-1 font-mono text-[10px] text-op-text-dim">{issue.relativePath}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

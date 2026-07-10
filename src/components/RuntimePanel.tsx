import { InfoCard } from "./InfoCard";
import { StatusPill } from "./StatusPill";
import { SafeModePanel } from "./SafeModePanel";
import { useApiResource } from "../lib/useApiResource";
import { operatorDashboardService } from "../lib/operatorDashboardService";
import { api } from "../lib/apiClient";
import { labelForRuntimeHealth, toneForRuntimeHealth } from "../lib/runtimeHealth";

export function RuntimePanel() {
  const systemState = useApiResource(api.getSystemState, { pollIntervalMs: 12_000 });
  const telemetry = useApiResource(operatorDashboardService.getTelemetrySummary, { pollIntervalMs: 12_000 });

  const state = systemState.result?.ok ? systemState.result.data.state : null;
  const runtime = state?.runtimeHealth;
  const telemetryData = telemetry.result?.ok ? telemetry.result.data.summary : null;
  const routes = telemetryData?.routeLatency ?? [];

  return (
    <div id="runtime-panel" className="flex flex-col gap-4">
      <SafeModePanel state={state} />

      <div className="op-panel rounded-sm p-4">
        <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Runtime health</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {runtime ? (
            <>
              <StatusPill tone={toneForRuntimeHealth(runtime.state)}>
                {labelForRuntimeHealth(runtime.state)}
              </StatusPill>
              <span className="font-mono text-sm text-op-text">score {runtime.score}</span>
            </>
          ) : (
            <span className="text-xs text-op-text-dim">—</span>
          )}
        </div>

        {runtime ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InfoCard label="Worker success">
              <span className="font-mono">{runtime.factors.workerSuccess}%</span>
            </InfoCard>
            <InfoCard label="Latency p95">
              <span className="font-mono">{runtime.factors.latencyP95}ms</span>
            </InfoCard>
            <InfoCard label="Error rate">
              <span className="font-mono">{runtime.factors.errorRate}%</span>
            </InfoCard>
            <InfoCard label="Ghost layer">
              <StatusPill tone={state?.ghost?.connected ? "ok" : "danger"}>
                {state?.ghost?.connected ? "connected" : "degraded"}
              </StatusPill>
            </InfoCard>
          </div>
        ) : null}
      </div>

      <div className="op-panel rounded-sm p-4">
        <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Worker metrics</h2>
        {telemetryData ? (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <InfoCard label="Requests">
              <span className="font-mono">{telemetryData.requestCount}</span>
            </InfoCard>
            <InfoCard label="Errors">
              <span className="font-mono">{telemetryData.errorCount}</span>
            </InfoCard>
            <InfoCard label="Uptime">
              <span className="font-mono">{telemetryData.uptimePct}%</span>
            </InfoCard>
            <InfoCard label="p50 latency">
              <span className="font-mono">{telemetryData.latencyP50Ms}ms</span>
            </InfoCard>
            <InfoCard label="p95 latency">
              <span className="font-mono">{telemetryData.latencyP95Ms}ms</span>
            </InfoCard>
            <InfoCard label="Governance events">
              <span className="font-mono">{telemetryData.governanceEventCount}</span>
            </InfoCard>
          </div>
        ) : (
          <p className="mt-3 text-xs text-op-text-dim">Loading telemetry…</p>
        )}
      </div>

      {routes.length > 0 ? (
        <div className="op-panel rounded-sm p-4">
          <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Route latency</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-op-text-dim">
                  <th className="pb-2 pr-4 font-normal uppercase tracking-widest">Route</th>
                  <th className="pb-2 pr-4 font-normal uppercase tracking-widest">Count</th>
                  <th className="pb-2 pr-4 font-normal uppercase tracking-widest">p95</th>
                  <th className="pb-2 font-normal uppercase tracking-widest">Errors</th>
                </tr>
              </thead>
              <tbody>
                {routes.slice(0, 10).map((route) => (
                  <tr key={route.path} className="border-t border-op-border/60">
                    <td className="py-2 pr-4 font-mono">{route.path}</td>
                    <td className="py-2 pr-4">{route.count}</td>
                    <td className="py-2 pr-4">{route.p95Ms}ms</td>
                    <td className="py-2">{route.errorCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

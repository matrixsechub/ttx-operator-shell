import { StatusPill } from "./StatusPill";
import { useApiResource } from "../lib/useApiResource";
import { operatorDashboardService } from "../lib/operatorDashboardService";

export function AgentRegistryPanel() {
  const { result, loading, refresh } = useApiResource(operatorDashboardService.listAgents, {
    pollIntervalMs: 20_000,
  });

  const agents = result?.ok ? result.data.agents : [];

  return (
    <div id="agent-registry-panel" className="op-panel rounded-sm p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Agent registry</h2>
          <p className="mt-1 text-[11px] text-op-text-dim">Codex-defined agents with AI gateway usage signals.</p>
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
        <p className="mt-4 text-xs text-op-text-dim">Loading agents…</p>
      ) : !result.ok ? (
        <p className="mt-4 text-xs text-op-danger">{result.error}</p>
      ) : agents.length === 0 ? (
        <p className="mt-4 text-xs text-op-text-dim">No agents in codex manifest.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-op-text-dim">
                <th className="pb-2 pr-3 font-normal uppercase tracking-widest">Agent</th>
                <th className="pb-2 pr-3 font-normal uppercase tracking-widest">Role</th>
                <th className="pb-2 pr-3 font-normal uppercase tracking-widest">Autonomy</th>
                <th className="pb-2 pr-3 font-normal uppercase tracking-widest">State</th>
                <th className="pb-2 font-normal uppercase tracking-widest">Requests</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.agentId} className="border-t border-op-border/60">
                  <td className="py-2 pr-3">
                    <p className="text-op-text">{agent.name}</p>
                    <p className="font-mono text-[10px] text-op-text-dim">{agent.agentId}</p>
                  </td>
                  <td className="py-2 pr-3 text-op-text-dim">{agent.role}</td>
                  <td className="py-2 pr-3">
                    <span className="font-mono">{agent.autonomyLevel}</span>
                    {agent.approvalGated ? (
                      <span className="ml-1 text-[10px] text-op-amber">gated</span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3">
                    <StatusPill tone={agent.state === "active" ? "ok" : "neutral"}>{agent.state}</StatusPill>
                  </td>
                  <td className="py-2 font-mono">{agent.requestCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

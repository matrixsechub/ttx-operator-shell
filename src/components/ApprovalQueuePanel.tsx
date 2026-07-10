import { useState } from "react";
import { StatusPill } from "./StatusPill";
import { governanceService, type ActionProposal } from "../lib/governanceService";
import { useApiResource } from "../lib/useApiResource";

function truncateHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

function toneForRisk(qualitative: ActionProposal["risk_score"]["qualitative"]): "ok" | "warn" | "danger" {
  if (qualitative === "critical" || qualitative === "high") return "danger";
  if (qualitative === "medium") return "warn";
  return "ok";
}

export function ApprovalQueuePanel({ limit }: { limit?: number }) {
  const { result, loading, refresh, lastFetchedAt } = useApiResource(
    () => governanceService.listProposals("pending"),
    { pollIntervalMs: 15_000 },
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const proposals = result?.ok ? result.data.proposals : [];
  const visibleProposals = limit !== undefined ? proposals.slice(0, limit) : proposals;

  async function handleApprove(proposalId: string) {
    setBusyId(proposalId);
    setError(null);
    const response = await governanceService.approveProposal(proposalId);
    setBusyId(null);
    if (!response.ok) {
      setError(response.error);
      return;
    }
    refresh();
  }

  async function handleDeny(proposalId: string) {
    const reason = window.prompt("Denial reason");
    if (!reason?.trim()) return;
    setBusyId(proposalId);
    setError(null);
    const response = await governanceService.denyProposal(proposalId, reason.trim());
    setBusyId(null);
    if (!response.ok) {
      setError(response.error);
      return;
    }
    refresh();
  }

  return (
    <div className="op-panel rounded-sm p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Approval Queue</h2>
          <p className="mt-1 text-[11px] text-op-text-dim">
            Governed proposals awaiting operator decision.
            {lastFetchedAt ? ` · synced ${lastFetchedAt.toLocaleTimeString()}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          className="rounded-sm border border-op-border-bright px-3 py-1.5 text-[11px] uppercase tracking-widest text-op-text-dim hover:border-op-accent/50 hover:text-op-accent"
        >
          {loading ? "syncing…" : "refresh"}
        </button>
      </div>

      {error ? <p className="mt-3 text-xs text-op-danger">{error}</p> : null}

      {loading && proposals.length === 0 ? (
        <p className="mt-4 text-xs text-op-text-dim">Loading pending proposals…</p>
      ) : visibleProposals.length === 0 ? (
        <p className="mt-4 text-xs text-op-text-dim">No pending proposals.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {visibleProposals.map((proposal) => (
            <div key={proposal.proposal_id} className="rounded-sm border border-op-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-op-text">{proposal.summary}</p>
                  <p className="mt-1 text-[11px] text-op-text-dim">
                    {proposal.target_system} · {proposal.action_class}
                    {proposal.revision ? ` · rev ${proposal.revision}` : ""} · by {proposal.created_by}
                  </p>
                </div>
                <StatusPill tone={toneForRisk(proposal.risk_score.qualitative)}>
                  {proposal.risk_score.qualitative}
                </StatusPill>
              </div>
              <p className="mt-2 text-[11px] text-op-text-dim">{proposal.intended_outcome}</p>
              <p className="mt-2 text-[11px] text-op-amber">Rollback: {proposal.rollback_plan}</p>
              <p className="mt-1 font-mono text-[10px] text-op-text-dim">
                beacon {truncateHash(proposal.beacon_hash)} · codex {truncateHash(proposal.codex_hash)}
              </p>
              <p className="mt-1 text-[10px] text-op-text-dim">
                expires {new Date(proposal.expiration).toLocaleString()}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyId === proposal.proposal_id}
                  onClick={() => void handleApprove(proposal.proposal_id)}
                  className="rounded-sm border border-op-accent/50 px-3 py-1 text-[11px] uppercase tracking-widest text-op-accent hover:bg-op-accent/10 disabled:opacity-50"
                >
                  approve
                </button>
                <button
                  type="button"
                  disabled={busyId === proposal.proposal_id}
                  onClick={() => void handleDeny(proposal.proposal_id)}
                  className="rounded-sm border border-op-danger/40 px-3 py-1 text-[11px] uppercase tracking-widest text-op-danger hover:bg-op-danger/10 disabled:opacity-50"
                >
                  deny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

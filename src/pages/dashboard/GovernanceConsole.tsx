import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { OperatorShell } from "../../components/OperatorShell";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { StatusPill } from "../../components/StatusPill";
import { useApiResource } from "../../lib/useApiResource";
import {
  operatorGovernanceService,
  type GovernanceHealthView,
} from "../../lib/operatorGovernanceService";
import {
  councilAdvisoryLabel,
  filterProposalQueue,
  formatAuditTimeline,
  requiresConfirmation,
  truncateHash,
} from "./governanceConsoleLogic";

function toneForRisk(level: string): "ok" | "warn" | "danger" {
  if (level === "critical" || level === "high") return "danger";
  if (level === "medium") return "warn";
  return "ok";
}

function GovernanceStatusHeader({ health }: { health: GovernanceHealthView | null }) {
  if (!health) {
    return <p className="text-xs text-op-text-dim">Loading governance status…</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 text-[11px] lg:grid-cols-4">
      <div className="rounded-sm border border-op-border p-3">
        <p className="text-op-text-dim">Beacon v2</p>
        <p className={health.beacon.runtimeStatus === "verified_v2" ? "text-op-accent" : "text-op-danger"}>
          {health.beacon.runtimeStatus}
        </p>
        <p className="mt-1 font-mono text-[10px] text-op-text-dim">{truncateHash(health.beacon.hash)}</p>
      </div>
      <div className="rounded-sm border border-op-border p-3">
        <p className="text-op-text-dim">Codex hash</p>
        <p className="font-mono text-[10px] text-op-text">{truncateHash(health.codex.manifestHash)}</p>
        <p className="mt-1 text-op-text-dim">Receipt authority: {health.governance.receiptAuthorityAvailable ? "ok" : "down"}</p>
      </div>
      <div className="rounded-sm border border-op-border p-3">
        <p className="text-op-text-dim">Safe mode</p>
        <p className={health.safeMode.active ? "text-op-danger" : "text-op-accent"}>
          {health.safeMode.active ? "ACTIVE" : "off"}
        </p>
        <p className="mt-1 text-op-text-dim">Pending: {health.pendingProposals}</p>
      </div>
      <div className="rounded-sm border border-op-border p-3">
        <p className="text-op-text-dim">Denials (recent)</p>
        <p>{health.recentDenialCount}</p>
        <p className="mt-1 text-op-text-dim">Expired: {health.expiredProposals}</p>
      </div>
    </div>
  );
}

function SafeModeControls({ onChanged }: { onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const safeMode = useApiResource(() => operatorGovernanceService.getSafeMode(), { pollIntervalMs: 20_000 });

  async function toggleSafeMode(enter: boolean) {
    const reason = window.prompt(enter ? "Safe mode reason (required)" : "Exit safe mode reason");
    if (!reason?.trim()) return;
    setBusy(true);
    const response = enter
      ? await operatorGovernanceService.enterSafeMode(reason.trim())
      : await operatorGovernanceService.exitSafeMode(reason.trim());
    setBusy(false);
    if (!response.ok) {
      window.alert(response.error);
      return;
    }
    safeMode.refresh();
    onChanged();
  }

  const active = safeMode.result?.ok ? safeMode.result.data.safeMode.active : false;

  return (
    <div className="op-panel rounded-sm p-4">
      <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Safe mode controls</h2>
      <p className="mt-2 text-[11px] text-op-text-dim">
        Operator-only containment. Mutations C2–C6 are blocked while active.
      </p>
      {safeMode.result?.ok ? (
        <dl className="mt-3 grid grid-cols-1 gap-2 text-[11px]">
          <div>
            <dt className="text-op-text-dim">State</dt>
            <dd className={active ? "text-op-danger" : "text-op-accent"}>{active ? "active" : "inactive"}</dd>
          </div>
          {active ? (
            <>
              <div>
                <dt className="text-op-text-dim">Reason</dt>
                <dd>{safeMode.result.data.safeMode.reason}</dd>
              </div>
              <div>
                <dt className="text-op-text-dim">Activated by</dt>
                <dd>{safeMode.result.data.safeMode.activatedBy}</dd>
              </div>
            </>
          ) : null}
        </dl>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || active}
          onClick={() => void toggleSafeMode(true)}
          className="rounded-sm border border-op-danger/50 px-3 py-1 text-[11px] uppercase tracking-widest text-op-danger disabled:opacity-50"
        >
          enter safe mode
        </button>
        <button
          type="button"
          disabled={busy || !active}
          onClick={() => void toggleSafeMode(false)}
          className="rounded-sm border border-op-accent/50 px-3 py-1 text-[11px] uppercase tracking-widest text-op-accent disabled:opacity-50"
        >
          exit safe mode
        </button>
      </div>
    </div>
  );
}

function ProposalDetailPanel({
  proposalId,
  onChanged,
}: {
  proposalId: string | null;
  onChanged: () => void;
}) {
  const detail = useApiResource(
    () => (proposalId ? operatorGovernanceService.getProposal(proposalId) : Promise.resolve({ ok: false as const, error: "none", status: 0 })),
    { pollIntervalMs: 10_000 },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [constraints, setConstraints] = useState("");
  const [rationale, setRationale] = useState("");

  if (!proposalId) {
    return (
      <div className="op-panel rounded-sm p-4">
        <p className="text-xs text-op-text-dim">Select a proposal to inspect digest, council review, and audit chain.</p>
      </div>
    );
  }

  const data = detail.result?.ok ? detail.result.data : null;
  const proposal = data?.proposal ?? null;
  const review = data?.councilReview ?? null;

  async function runReview() {
    if (!proposalId) return;
    setBusy(true);
    setError(null);
    const response = await operatorGovernanceService.runCouncilReview(proposalId);
    setBusy(false);
    if (!response.ok) {
      setError(response.error);
      return;
    }
    detail.refresh();
  }

  async function decide(decision: "approve" | "deny" | "revision") {
    if (!proposal || !proposalId) return;
    if (decision === "approve" && requiresConfirmation(proposal.actionClass)) {
      const confirmed = window.confirm(
        `Confirm approval of ${proposal.actionClass} proposal?\nAny payload change invalidates the receipt.`,
      );
      if (!confirmed) return;
    }
    setBusy(true);
    setError(null);
    const constraintList = constraints
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const response =
      decision === "approve"
        ? await operatorGovernanceService.approveProposal(proposalId, {
            rationale: rationale.trim() || undefined,
            constraints: constraintList,
            actionType: proposal.actionType,
            mutationPayload: proposal.mutationPayload,
          })
        : decision === "deny"
          ? await operatorGovernanceService.denyProposal(proposalId, { rationale: rationale.trim() || "denied" })
          : await operatorGovernanceService.requestRevision(proposalId, rationale.trim() || "revision requested");
    setBusy(false);
    if (!response.ok) {
      setError(response.error);
      return;
    }
    detail.refresh();
    onChanged();
  }

  async function execute() {
    if (!proposalId) return;
    setBusy(true);
    setError(null);
    const response = await operatorGovernanceService.executeProposal(proposalId, {
      idempotencyKey: crypto.randomUUID(),
    });
    setBusy(false);
    if (!response.ok) {
      setError(response.error);
      return;
    }
    detail.refresh();
    onChanged();
  }

  return (
    <div className="op-panel rounded-sm p-4">
      <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Proposal detail</h2>
      {detail.loading && !proposal ? (
        <p className="mt-3 text-xs text-op-text-dim">Loading…</p>
      ) : !proposal ? (
        <p className="mt-3 text-xs text-op-danger">Proposal not found.</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm text-op-text">{proposal.summary}</p>
              <p className="mt-1 text-[11px] text-op-text-dim">
                {proposal.targetSystem} · {proposal.actionClass} · {proposal.actionType}
              </p>
            </div>
            <StatusPill tone={toneForRisk(proposal.riskLevel)}>{proposal.riskLevel}</StatusPill>
          </div>
          <p className="mt-2 text-[11px] text-op-text-dim">{proposal.intendedOutcome}</p>
          <pre className="op-scrollbar mt-3 max-h-40 overflow-auto rounded-sm border border-op-border bg-op-bg p-2 text-[10px] text-op-text">
            {JSON.stringify(proposal.mutationPayload, null, 2)}
          </pre>
          <p className="mt-2 font-mono text-[10px] text-op-text-dim">
            digest {proposal.actionDigest ? truncateHash(proposal.actionDigest) : "pending approval binding"}
          </p>
          <p className="font-mono text-[10px] text-op-text-dim">
            beacon {truncateHash(proposal.beaconHash)} · codex {truncateHash(proposal.codexHash)}
          </p>
          <p className="mt-2 text-[11px] text-op-amber">Rollback: {proposal.rollbackPlan || "—"}</p>

          {review ? (
            <div className="mt-4 rounded-sm border border-op-border p-3 text-[11px]">
              <p className="text-op-text-dim">{councilAdvisoryLabel(review.advisoryOnly)}</p>
              <p className="mt-1 text-op-text">Recommended: {review.recommendedDecision}</p>
              {review.disagreements.length > 0 ? (
                <ul className="mt-2 list-disc pl-4 text-op-amber">
                  {review.disagreements.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void runReview()}
              className="mt-4 rounded-sm border border-op-border-bright px-3 py-1 text-[11px] uppercase tracking-widest text-op-text-dim hover:text-op-accent"
            >
              run council review
            </button>
          )}

          <div className="mt-4 grid gap-2">
            <textarea
              value={rationale}
              onChange={(event) => setRationale(event.target.value)}
              placeholder={requiresConfirmation(proposal.actionClass) ? "Operator rationale (required for C4–C6)" : "Optional rationale"}
              className="min-h-[60px] w-full rounded-sm border border-op-border bg-op-bg p-2 text-[11px] text-op-text"
            />
            <textarea
              value={constraints}
              onChange={(event) => setConstraints(event.target.value)}
              placeholder="Constraints (one per line)"
              className="min-h-[48px] w-full rounded-sm border border-op-border bg-op-bg p-2 text-[11px] text-op-text"
            />
          </div>

          <p className="mt-2 text-[10px] text-op-amber">
            Approving binds the exact action digest. Any mutation after approval invalidates the receipt.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || proposal.status !== "pending"}
              onClick={() => void decide("approve")}
              className="rounded-sm border border-op-accent/50 px-3 py-1 text-[11px] uppercase tracking-widest text-op-accent disabled:opacity-50"
            >
              approve exact proposal
            </button>
            <button
              type="button"
              disabled={busy || proposal.status !== "pending"}
              onClick={() => void decide("deny")}
              className="rounded-sm border border-op-danger/40 px-3 py-1 text-[11px] uppercase tracking-widest text-op-danger disabled:opacity-50"
            >
              deny
            </button>
            <button
              type="button"
              disabled={busy || proposal.status !== "pending"}
              onClick={() => void decide("revision")}
              className="rounded-sm border border-op-border-bright px-3 py-1 text-[11px] uppercase tracking-widest text-op-text-dim disabled:opacity-50"
            >
              request revision
            </button>
            <button
              type="button"
              disabled={busy || (proposal.status !== "approved" && proposal.status !== "executed")}
              onClick={() => void execute()}
              className="rounded-sm border border-op-accent/30 px-3 py-1 text-[11px] uppercase tracking-widest text-op-text disabled:opacity-50"
            >
              execute with receipt
            </button>
          </div>

          {data?.auditEvents?.length ? (
            <div className="mt-4">
              <p className="text-[11px] uppercase tracking-widest text-op-text-dim">Audit timeline</p>
              <ul className="mt-2 flex flex-col gap-1 text-[10px] text-op-text-dim">
                {formatAuditTimeline(data.auditEvents).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
      {error ? <p className="mt-3 text-xs text-op-danger">{error}</p> : null}
    </div>
  );
}

export function GovernanceConsole() {
  const health = useApiResource(() => operatorGovernanceService.getHealth(), { pollIntervalMs: 15_000 });
  const proposals = useApiResource(() => operatorGovernanceService.listProposals(), { pollIntervalMs: 12_000 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [classFilter, setClassFilter] = useState<string>("all");

  const queue = useMemo(() => {
    const rows = proposals.result?.ok ? proposals.result.data.proposals : [];
    return filterProposalQueue(rows, statusFilter, classFilter);
  }, [proposals.result, statusFilter, classFilter]);

  return (
    <OperatorShell>
      <div className="flex flex-col gap-5">
        <Breadcrumbs
          trail={[
            { label: "Cockpit", to: "/dashboard" },
            { label: "Governance", to: "/dashboard/governance" },
            { label: "Console" },
          ]}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg uppercase tracking-widest text-op-accent">Governance Console</h1>
          <Link
            to="/dashboard/audit"
            className="text-[11px] uppercase tracking-widest text-op-text-dim hover:text-op-accent"
          >
            audit stream →
          </Link>
        </div>

        <GovernanceStatusHeader health={health.result?.ok ? health.result.data : null} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="op-panel rounded-sm p-4">
            <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Proposal queue</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-sm border border-op-border bg-op-bg px-2 py-1 text-op-text"
              >
                <option value="all">all statuses</option>
                <option value="pending">pending</option>
                <option value="approved">approved</option>
                <option value="denied">denied</option>
                <option value="executed">executed</option>
              </select>
              <select
                value={classFilter}
                onChange={(event) => setClassFilter(event.target.value)}
                className="rounded-sm border border-op-border bg-op-bg px-2 py-1 text-op-text"
              >
                <option value="all">all classes</option>
                {(["C0", "C1", "C2", "C3", "C4", "C5", "C6"] as const).map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="text-op-text-dim">
                  <tr>
                    <th className="py-1 pr-2">Proposal</th>
                    <th className="py-1 pr-2">Target</th>
                    <th className="py-1 pr-2">Class</th>
                    <th className="py-1 pr-2">Risk</th>
                    <th className="py-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((row) => (
                    <tr
                      key={row.id}
                      className={`cursor-pointer border-t border-op-border/60 hover:bg-op-accent/5 ${selectedId === row.id ? "bg-op-accent/10" : ""}`}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <td className="py-2 pr-2 text-op-text">{row.summary}</td>
                      <td className="py-2 pr-2 text-op-text-dim">{row.target}</td>
                      <td className="py-2 pr-2">{row.actionClass}</td>
                      <td className="py-2 pr-2">{row.risk}</td>
                      <td className="py-2">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {queue.length === 0 ? <p className="mt-3 text-xs text-op-text-dim">No proposals match filters.</p> : null}
            </div>
          </div>

          <ProposalDetailPanel
            proposalId={selectedId}
            onChanged={() => {
              proposals.refresh();
              health.refresh();
            }}
          />
        </div>

        <SafeModeControls
          onChanged={() => {
            health.refresh();
          }}
        />
      </div>
    </OperatorShell>
  );
}

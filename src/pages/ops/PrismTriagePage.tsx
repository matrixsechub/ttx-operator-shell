import { useCallback, useState } from "react";
import { OperatorShell } from "../../components/OperatorShell";
import { StatusPill } from "../../components/StatusPill";
import { PrismPatchProposalPanel } from "../../components/prism/PrismPatchProposalPanel";
import { PrismTriageQueue } from "../../components/prism/PrismTriageQueue";
import { useApiResource } from "../../lib/useApiResource";
import { uiuxExpertService } from "../../lib/uiuxExpertService";
import { prismTriageService } from "../../lib/prismTriageService";
import type { PrismPatchProposal, PrismTriageItem } from "../../lib/prismTriageTypes";

export function PrismTriagePage() {
  const { result: queueResult, loading: queueLoading, refresh: refreshQueue } = useApiResource(
    prismTriageService.listTriage,
  );
  const { result: auditListResult } = useApiResource(uiuxExpertService.listAudits);

  const queueItems = queueResult?.ok ? queueResult.data.items : [];
  const audits = auditListResult?.ok ? auditListResult.data.audits : [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PrismTriageItem | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<PrismPatchProposal | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [generateAuditId, setGenerateAuditId] = useState("");
  const [dispositionReason, setDispositionReason] = useState("");

  const loadTriageDetail = useCallback(async (triageId: string) => {
    setSelectedId(triageId);
    setDetailLoading(true);
    const res = await prismTriageService.getTriage(triageId);
    setDetailLoading(false);
    if (res.ok) {
      setSelectedItem(res.data.item);
      setSelectedProposal(res.data.proposals[0] ?? null);
    } else {
      setSelectedItem(null);
      setSelectedProposal(null);
      setActionMessage(res.error);
    }
  }, []);

  async function handleGenerateTriage() {
    if (!generateAuditId.trim()) {
      setActionMessage("Select a source audit ID.");
      return;
    }
    setActionLoading(true);
    setActionMessage(null);
    const res = await prismTriageService.generateTriage(generateAuditId.trim());
    setActionLoading(false);
    if (!res.ok) {
      setActionMessage(res.error);
      return;
    }
    setActionMessage(
      `Triage generated: ${res.data.created} created, ${res.data.updated} updated. Source audit unchanged.`,
    );
    await refreshQueue();
    if (res.data.items[0]) {
      await loadTriageDetail(res.data.items[0].triageId);
    }
  }

  async function handleGenerateProposal() {
    if (!selectedId) return;
    setActionLoading(true);
    setActionMessage(null);
    const res = await prismTriageService.generateProposal(selectedId);
    setActionLoading(false);
    if (!res.ok) {
      setActionMessage(res.error);
      return;
    }
    setSelectedItem(res.data.item);
    setSelectedProposal(res.data.proposal);
    setActionMessage(`Proposal revision ${res.data.proposal.governance.revision} generated (advisory only).`);
    await refreshQueue();
  }

  async function handleDisposition(status: "accepted_for_planning" | "deferred" | "dismissed") {
    if (!selectedId || !dispositionReason.trim()) {
      setActionMessage("Disposition reason is required.");
      return;
    }
    setActionLoading(true);
    const res = await prismTriageService.recordDisposition(selectedId, {
      status,
      reason: dispositionReason.trim(),
    });
    setActionLoading(false);
    if (!res.ok) {
      setActionMessage(res.error);
      return;
    }
    setSelectedItem(res.data.item);
    setActionMessage(`Disposition recorded: ${status}`);
    await refreshQueue();
  }

  return (
    <OperatorShell>
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <header>
          <p className="text-xs uppercase tracking-widest text-op-text-dim">
            <a href="/operator/uiux-expert" className="text-op-accent hover:underline">
              PRISM
            </a>
            {" / "}Triage
          </p>
          <h1 className="text-2xl text-op-accent">PRISM — Operator Triage Queue</h1>
          <p className="mt-2 max-w-3xl text-sm text-op-text-dim">
            Convert validated PRISM findings into governed patch proposals. This surface records operator disposition
            only — it does not apply patches, commit, deploy, or grant mutation authority.
          </p>
        </header>

        <div className="grid gap-3 rounded-sm border border-op-amber/40 bg-op-panel p-4 text-sm text-op-amber sm:grid-cols-3">
          <div>ADVISORY ONLY</div>
          <div>OPERATOR APPROVAL REQUIRED</div>
          <div>NO MUTATION AUTHORITY</div>
        </div>

        <section className="op-panel rounded-sm p-4">
          <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Generate triage from audit</h2>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="text-op-text-dim">Source audit</span>
              <select
                className="rounded-sm border border-op-border bg-op-bg px-3 py-2 text-base text-op-text"
                value={generateAuditId}
                onChange={(e) => setGenerateAuditId(e.target.value)}
              >
                <option value="">Select persisted audit…</option>
                {audits.map((audit) => (
                  <option key={audit.auditId} value={audit.auditId}>
                    {audit.auditId.slice(0, 8)}… · {audit.mode} · {audit.releaseRecommendation}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => void handleGenerateTriage()}
              className="rounded-sm border border-op-accent/50 px-4 py-2 text-sm uppercase tracking-widest text-op-accent disabled:opacity-50"
            >
              Generate triage
            </button>
          </div>
        </section>

        {actionMessage && (
          <p className="text-sm text-op-accent" role="status">
            {actionMessage}
          </p>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="op-panel rounded-sm p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Triage queue</h2>
              <StatusPill tone="neutral">{queueItems.length} items</StatusPill>
            </div>
            <PrismTriageQueue
              items={queueItems}
              selectedId={selectedId}
              loading={queueLoading}
              onSelect={(id) => void loadTriageDetail(id)}
            />
          </section>

          <section className="op-panel rounded-sm p-4">
            {detailLoading && <p className="text-sm text-op-text-dim">Loading triage detail…</p>}
            {!detailLoading && !selectedItem && (
              <p className="text-sm text-op-text-dim">Select a triage item to review evidence and proposals.</p>
            )}
            {selectedItem && !detailLoading && (
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-lg text-op-text">{selectedItem.title}</h2>
                  <p className="mt-1 text-xs text-op-text-dim">
                    Priority {selectedItem.priorityScore} · {selectedItem.status} · audit{" "}
                    <a
                      href={`/operator/uiux-expert`}
                      className="font-mono text-op-accent hover:underline"
                    >
                      {selectedItem.sourceAuditId.slice(0, 12)}…
                    </a>
                  </p>
                </div>

                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-op-text-dim">User impact</dt>
                    <dd>{selectedItem.userImpact}</dd>
                  </div>
                  <div>
                    <dt className="text-op-text-dim">Evidence summary</dt>
                    <dd className="text-op-text-dim">{selectedItem.evidenceSummary}</dd>
                  </div>
                  <div>
                    <dt className="text-op-text-dim">Recommendation</dt>
                    <dd>{selectedItem.recommendation}</dd>
                  </div>
                  <div>
                    <dt className="text-op-text-dim">Routes / viewports</dt>
                    <dd>
                      {selectedItem.routes.join(", ")} · {selectedItem.viewports.join(", ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-op-text-dim">Acceptance criteria</dt>
                    <dd>
                      <ul className="list-disc pl-5">
                        {selectedItem.acceptanceCriteria.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => void handleGenerateProposal()}
                    className="rounded-sm border border-op-accent/50 px-3 py-2 text-xs uppercase tracking-widest text-op-accent disabled:opacity-50"
                  >
                    Generate proposal
                  </button>
                  <a
                    href="/council"
                    className="rounded-sm border border-op-border px-3 py-2 text-xs uppercase tracking-widest text-op-text-dim"
                  >
                    Open HSX advisory
                  </a>
                </div>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-op-text-dim">Disposition reason</span>
                  <input
                    className="rounded-sm border border-op-border bg-op-bg px-3 py-2 text-base text-op-text"
                    value={dispositionReason}
                    onChange={(e) => setDispositionReason(e.target.value)}
                    placeholder="Operator rationale for disposition"
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => void handleDisposition("accepted_for_planning")}
                    className="rounded-sm border border-op-accent/50 px-3 py-2 text-xs uppercase tracking-widest text-op-accent disabled:opacity-50"
                  >
                    Accept for planning
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => void handleDisposition("deferred")}
                    className="rounded-sm border border-op-border px-3 py-2 text-xs uppercase tracking-widest text-op-text-dim disabled:opacity-50"
                  >
                    Defer
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => void handleDisposition("dismissed")}
                    className="rounded-sm border border-op-danger/50 px-3 py-2 text-xs uppercase tracking-widest text-op-danger disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </div>

                <PrismPatchProposalPanel
                  proposal={selectedProposal}
                  loading={false}
                  onRegenerate={() => void handleGenerateProposal()}
                  actionLoading={actionLoading}
                />
              </div>
            )}
          </section>
        </div>
      </div>
    </OperatorShell>
  );
}

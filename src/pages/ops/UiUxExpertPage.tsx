import { useCallback, useState, type FormEvent } from "react";
import { OperatorShell } from "../../components/OperatorShell";
import { StatusPill } from "../../components/StatusPill";
import { useApiResource } from "../../lib/useApiResource";
import { uiuxExpertService } from "../../lib/uiuxExpertService";
import type { UiUxAudit, UiUxAuditMode, UiUxFinding, UiUxFindingSeverity, UiUxViewport } from "../../lib/uiuxTypes";
import {
  FIXTURE_ROUTE_PRESETS,
  SEVERITY_ORDER,
  UIUX_AUDIT_MODES,
  UIUX_VIEWPORTS,
} from "../../lib/uiuxTypes";

function releaseTone(rec: UiUxAudit["releaseRecommendation"]): "ok" | "warn" | "danger" | "neutral" {
  switch (rec) {
    case "PASS":
      return "ok";
    case "PASS_WITH_ADVISORIES":
      return "warn";
    case "CHANGES_REQUIRED":
      return "warn";
    case "BLOCK_RELEASE":
      return "danger";
    default: {
      const never: never = rec;
      return never;
    }
  }
}

function severityTone(severity: UiUxFindingSeverity): "danger" | "warn" | "neutral" | "ok" {
  switch (severity) {
    case "critical":
    case "high":
      return "danger";
    case "medium":
      return "warn";
    case "low":
    case "info":
      return "neutral";
    default: {
      const never: never = severity;
      return never;
    }
  }
}

function groupFindingsBySeverity(findings: UiUxFinding[]): Record<UiUxFindingSeverity, UiUxFinding[]> {
  const groups = Object.fromEntries(SEVERITY_ORDER.map((s) => [s, [] as UiUxFinding[]])) as Record<
    UiUxFindingSeverity,
    UiUxFinding[]
  >;
  for (const finding of findings) {
    groups[finding.severity].push(finding);
  }
  return groups;
}

const SCORECARD_ROWS: { key: keyof UiUxAudit["scorecard"]; label: string }[] = [
  { key: "usability", label: "Usability" },
  { key: "accessibility", label: "Accessibility" },
  { key: "responsive", label: "Responsive" },
  { key: "visualHierarchy", label: "Visual hierarchy" },
  { key: "designSystem", label: "Design system" },
  { key: "conversion", label: "Conversion" },
  { key: "feedbackStates", label: "Feedback states" },
  { key: "performance", label: "Performance" },
];

export function UiUxExpertPage() {
  const { result: listResult, loading: listLoading, refresh: refreshList } = useApiResource(uiuxExpertService.listAudits);
  const audits = listResult?.ok ? listResult.data.audits : [];

  const [mode, setMode] = useState<UiUxAuditMode>("AUDIT_ROUTE");
  const [viewport, setViewport] = useState<UiUxViewport>("mobile");
  const [routesText, setRoutesText] = useState("/\n/services\n/enter");
  const [component, setComponent] = useState("");
  const [useFixture, setUseFixture] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedAudit, setSelectedAudit] = useState<UiUxAudit | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadAudit = useCallback(async (auditId: string) => {
    setSelectedId(auditId);
    setDetailLoading(true);
    setDetailError(null);
    const res = await uiuxExpertService.getAudit(auditId);
    setDetailLoading(false);
    if (res.ok) {
      setSelectedAudit(res.data.audit);
    } else {
      setSelectedAudit(null);
      setDetailError(res.error);
    }
  }, []);

  async function handleCreateAudit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFormLoading(true);
    setActionMessage(null);

    const routes = routesText
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean);

    const payload = {
      mode,
      viewport,
      useFixture,
      routes: routes.length > 0 ? routes : undefined,
      component: component.trim() || undefined,
    };

    const res = await uiuxExpertService.createAudit(payload);
    setFormLoading(false);

    if (!res.ok) {
      setFormError(res.error);
      return;
    }

    setActionMessage("Audit created successfully.");
    await refreshList();
    await loadAudit(res.data.audit.auditId);
  }

  async function handleApproval(action: "approve" | "reject") {
    if (!selectedAudit) return;
    setActionLoading(true);
    setActionMessage(null);
    const findingIds = selectedAudit.findings.filter((f) => f.status === "open").map((f) => f.id);
    const res =
      action === "approve"
        ? await uiuxExpertService.approveAudit(selectedAudit.auditId, { findingIds })
        : await uiuxExpertService.rejectAudit(selectedAudit.auditId, { findingIds });
    setActionLoading(false);
    if (!res.ok) {
      setActionMessage(res.error);
      return;
    }
    setSelectedAudit(res.data.audit);
    setActionMessage(action === "approve" ? "Recommendations accepted (advisory only)." : "Recommendations rejected.");
    await refreshList();
  }

  function applyPreset(route: string) {
    setRoutesText((prev) => {
      const lines = prev.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.includes(route)) return prev;
      return [...lines, route].join("\n");
    });
  }

  const grouped = selectedAudit ? groupFindingsBySeverity(selectedAudit.findings) : null;

  return (
    <OperatorShell>
      <div className="flex flex-col gap-6 p-4 sm:p-6" aria-live="polite">
        <header>
          <p className="text-xs uppercase tracking-widest text-op-text-dim">Builder Council</p>
          <h1 className="text-2xl text-op-accent">PRISM — UI/UX Expert</h1>
          <p className="mt-2 max-w-3xl text-sm text-op-text-dim">
            Advisory UI/UX specialist for operator review. Recommendations do not mutate code, deploy, or production state.
            Explicit operator approval is required for any follow-up action.{" "}
            <a href="/operator/uiux-expert/triage" className="text-op-accent hover:underline">
              Open triage queue
            </a>
          </p>
        </header>

        <div className="rounded-sm border border-op-amber/40 bg-op-panel p-4 text-sm text-op-amber" role="status">
          Advisory only — PRISM cannot autonomously edit files, deploy, or approve its own recommendations.
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="op-panel rounded-sm p-4" aria-labelledby="new-audit-heading">
            <h2 id="new-audit-heading" className="text-xs uppercase tracking-widest text-op-text-dim">
              New audit
            </h2>
            <form className="mt-4 flex flex-col gap-4" onSubmit={handleCreateAudit}>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-op-text-dim">Mode</span>
                <select
                  className="rounded-sm border border-op-border bg-op-bg px-3 py-2 text-base text-op-text"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as UiUxAuditMode)}
                >
                  {UIUX_AUDIT_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-op-text-dim">Viewport</span>
                <select
                  className="rounded-sm border border-op-border bg-op-bg px-3 py-2 text-base text-op-text"
                  value={viewport}
                  onChange={(e) => setViewport(e.target.value as UiUxViewport)}
                >
                  {UIUX_VIEWPORTS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-op-text-dim">Routes (one per line)</span>
                <textarea
                  className="min-h-28 rounded-sm border border-op-border bg-op-bg px-3 py-2 font-mono text-base text-op-text"
                  value={routesText}
                  onChange={(e) => setRoutesText(e.target.value)}
                  aria-describedby="route-presets"
                />
              </label>

              <div id="route-presets" className="flex flex-wrap gap-2">
                {FIXTURE_ROUTE_PRESETS.map((route) => (
                  <button
                    key={route}
                    type="button"
                    className="rounded-sm border border-op-border-bright px-2 py-1 text-xs text-op-text-dim"
                    onClick={() => applyPreset(route)}
                  >
                    + {route}
                  </button>
                ))}
              </div>

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-op-text-dim">Component (optional)</span>
                <input
                  className="rounded-sm border border-op-border bg-op-bg px-3 py-2 text-base text-op-text"
                  value={component}
                  onChange={(e) => setComponent(e.target.value)}
                  placeholder="e.g. OperatorShell"
                />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useFixture}
                  onChange={(e) => setUseFixture(e.target.checked)}
                />
                <span>Use route fixtures</span>
              </label>

              {formError && (
                <p className="text-sm text-op-danger" role="alert">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={formLoading}
                className="rounded-sm border border-op-accent/50 bg-op-panel-raised px-4 py-2 text-sm uppercase tracking-widest text-op-accent disabled:opacity-50"
              >
                {formLoading ? "Running audit…" : "Run audit"}
              </button>
            </form>
          </section>

          <section className="op-panel rounded-sm p-4" aria-labelledby="audit-history-heading">
            <div className="flex items-center justify-between">
              <h2 id="audit-history-heading" className="text-xs uppercase tracking-widest text-op-text-dim">
                Audit history
              </h2>
              <StatusPill tone={listLoading ? "neutral" : "ok"}>{listLoading ? "syncing" : `${audits.length} audits`}</StatusPill>
            </div>
            {audits.length === 0 && !listLoading ? (
              <p className="mt-4 text-sm text-op-text-dim">No audits yet. Run your first audit to populate history.</p>
            ) : (
              <ul className="mt-4 flex max-h-96 flex-col gap-2 overflow-y-auto op-scrollbar">
                {audits.map((audit) => (
                  <li key={audit.auditId}>
                    <button
                      type="button"
                      onClick={() => loadAudit(audit.auditId)}
                      className={`w-full rounded-sm border px-3 py-2 text-left text-sm transition-colors ${
                        selectedId === audit.auditId
                          ? "border-op-accent bg-op-panel-raised text-op-text"
                          : "border-op-border text-op-text-dim hover:border-op-border-bright"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs">{audit.mode}</span>
                        <span className="text-op-accent">{audit.overallScore}/100</span>
                      </div>
                      <div className="mt-1 text-xs text-op-text-dim">
                        {(audit.routes.length > 0 ? audit.routes.join(", ") : audit.component) ?? "—"} · {audit.viewport}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {actionMessage && (
          <p className="text-sm text-op-accent" role="status">
            {actionMessage}
          </p>
        )}

        {detailLoading && <p className="text-sm text-op-text-dim">Loading audit detail…</p>}
        {detailError && (
          <p className="text-sm text-op-danger" role="alert">
            {detailError}
          </p>
        )}

        {selectedAudit && !detailLoading && (
          <div className="flex flex-col gap-6">
            <section className="op-panel rounded-sm p-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg text-op-text">Overall score: {selectedAudit.scorecard.overall}/100</h2>
                <StatusPill tone={releaseTone(selectedAudit.releaseRecommendation)}>
                  {selectedAudit.releaseRecommendation}
                </StatusPill>
              </div>
              <p className="mt-2 text-xs text-op-text-dim">
                Evidence hash: <span className="font-mono">{selectedAudit.evidenceHash.slice(0, 16)}…</span>
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {SCORECARD_ROWS.map(({ key, label }) => (
                  <div key={key} className="rounded-sm border border-op-border px-3 py-2">
                    <p className="text-xs uppercase tracking-widest text-op-text-dim">{label}</p>
                    <p className="text-lg text-op-accent">{selectedAudit.scorecard[key] as number}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="op-panel rounded-sm p-4">
              <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Council envelope</h2>
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="text-op-text-dim">Problem frame</dt>
                  <dd>{selectedAudit.councilEnvelope.problemFrame}</dd>
                </div>
                <div>
                  <dt className="text-op-text-dim">Consensus</dt>
                  <dd>{selectedAudit.councilEnvelope.consensus}</dd>
                </div>
                {selectedAudit.councilEnvelope.activeDisagreements.length > 0 && (
                  <div>
                    <dt className="text-op-text-dim">Active disagreements</dt>
                    <dd>
                      <ul className="list-disc pl-5">
                        {selectedAudit.councilEnvelope.activeDisagreements.map((d) => (
                          <li key={d}>{d}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-op-text-dim">Recommended path</dt>
                  <dd>{selectedAudit.councilEnvelope.recommendedPath}</dd>
                </div>
              </dl>
            </section>

            {selectedAudit.ai_enrichment && (
              <section className="op-panel rounded-sm p-4">
                <h2 className="text-xs uppercase tracking-widest text-op-text-dim">AI enrichment (advisory)</h2>
                <pre className="mt-2 whitespace-pre-wrap text-sm text-op-text">{selectedAudit.ai_enrichment}</pre>
                {selectedAudit.ai_model && (
                  <p className="mt-2 text-xs text-op-text-dim">
                    Model: {selectedAudit.ai_model}
                    {selectedAudit.ai_latency_ms !== undefined ? ` · ${selectedAudit.ai_latency_ms}ms` : ""}
                  </p>
                )}
              </section>
            )}

            {selectedAudit.patchProposals && selectedAudit.patchProposals.length > 0 && (
              <section className="op-panel rounded-sm p-4">
                <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Patch proposals (preview only)</h2>
                <div className="mt-3 space-y-4">
                  {selectedAudit.patchProposals.map((proposal) => (
                    <article key={proposal.id} className="rounded-sm border border-op-border p-3">
                      <p className="font-mono text-xs text-op-accent">{proposal.filePath}</p>
                      <p className="mt-1 text-sm">{proposal.description}</p>
                      <pre className="mt-2 overflow-x-auto rounded-sm bg-op-bg p-2 text-xs text-op-text-dim">
                        {proposal.diffPreview}
                      </pre>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section className="op-panel rounded-sm p-4">
              <h2 className="text-xs uppercase tracking-widest text-op-text-dim">Findings</h2>
              {grouped &&
                SEVERITY_ORDER.map((severity) => {
                  const items = grouped[severity];
                  if (items.length === 0) return null;
                  return (
                    <div key={severity} className="mt-4">
                      <h3 className="mb-2 flex items-center gap-2 text-sm uppercase tracking-widest">
                        <StatusPill tone={severityTone(severity)}>{severity}</StatusPill>
                        <span className="text-op-text-dim">({items.length})</span>
                      </h3>
                      <ul className="space-y-3">
                        {items.map((finding) => (
                          <li key={finding.id} className="rounded-sm border border-op-border p-3">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-op-text-dim">
                              <span>{finding.category}</span>
                              {finding.route && <span>· {finding.route}</span>}
                              <span>· status: {finding.status}</span>
                              <span>· confidence {(finding.confidence * 100).toFixed(0)}%</span>
                            </div>
                            <p className="mt-2 text-sm">{finding.recommendation}</p>
                            <p className="mt-1 text-sm text-op-text-dim">Impact: {finding.userImpact}</p>
                            {finding.implementationHint && (
                              <p className="mt-1 text-xs text-op-accent">Hint: {finding.implementationHint}</p>
                            )}
                            <div className="mt-2">
                              <p className="text-xs uppercase tracking-widest text-op-text-dim">Acceptance criteria</p>
                              <ul className="mt-1 list-disc pl-5 text-sm">
                                {finding.acceptanceCriteria.map((c) => (
                                  <li key={c}>{c}</li>
                                ))}
                              </ul>
                            </div>
                            {finding.evidence.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs uppercase tracking-widest text-op-text-dim">Evidence</p>
                                <ul className="mt-1 space-y-1 text-xs text-op-text-dim">
                                  {finding.evidence.map((ev) => (
                                    <li key={`${ev.type}-${ev.source}`}>
                                      [{ev.type}] {ev.summary}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
            </section>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleApproval("approve")}
                className="rounded-sm border border-op-accent/50 px-4 py-2 text-sm uppercase tracking-widest text-op-accent disabled:opacity-50"
              >
                Approve recommendations
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleApproval("reject")}
                className="rounded-sm border border-op-danger/50 px-4 py-2 text-sm uppercase tracking-widest text-op-danger disabled:opacity-50"
              >
                Reject recommendations
              </button>
            </div>
          </div>
        )}
      </div>
    </OperatorShell>
  );
}

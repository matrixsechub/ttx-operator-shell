import { useCallback, useEffect, useState } from "react";
import type { FlywheelRun, FlywheelRunDetail } from "../../../shared/flywheel/contracts";
import type { FlywheelStageDefinition } from "../../../shared/flywheel/stages";
import { OperatorShell } from "../../components/OperatorShell";
import { EventTimeline } from "../../components/flywheel/EventTimeline";
import { GovernanceSummary } from "../../components/flywheel/GovernanceSummary";
import { InterventionPanel } from "../../components/flywheel/InterventionPanel";
import { StageMap } from "../../components/flywheel/StageMap";
import { flywheelService } from "../../lib/flywheelService";

interface PendingApproval { commandId: string; proposalId: string }
function pickString(value: unknown, key: string): string | null { return value && typeof value === "object" && typeof (value as Record<string, unknown>)[key] === "string" ? String((value as Record<string, unknown>)[key]) : null; }

export function FlywheelDashboard() {
  const [runs, setRuns] = useState<FlywheelRun[]>([]); const [stages, setStages] = useState<FlywheelStageDefinition[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null); const [detail, setDetail] = useState<FlywheelRunDetail | null>(null);
  const [error, setError] = useState<string | null>(null); const [offline, setOffline] = useState(false); const [busy, setBusy] = useState(false);
  const [command, setCommand] = useState("ANALYZE::FLYWHEEL::HEALTH"); const [pending, setPending] = useState<PendingApproval | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const [runsResult, stagesResult] = await Promise.all([flywheelService.listRuns(signal), flywheelService.getStages(signal)]);
    if (!runsResult.ok) { if (runsResult.error !== "Request cancelled") { setOffline(true); setError(runsResult.error); } return; }
    setOffline(false); setRuns(runsResult.data.runs); setStages(stagesResult.ok ? stagesResult.data.stages : stages);
    const id = selectedId ?? runsResult.data.runs[0]?.id ?? null; if (!selectedId && id) setSelectedId(id);
    if (id) { const detailResult = await flywheelService.getRun(id, signal); if (detailResult.ok) { setDetail(detailResult.data); setError(null); } else if (detailResult.error !== "Request cancelled") setError(`${detailResult.error}${detailResult.traceId ? ` · trace ${detailResult.traceId}` : ""}`); }
  }, [selectedId, stages]);

  useEffect(() => { const controller = new AbortController(); void refresh(controller.signal); const interval = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(controller.signal); }, 5_000); return () => { controller.abort(); window.clearInterval(interval); }; }, [refresh]);
  async function createRun() { setBusy(true); const result = await flywheelService.createRun(`mission-${Date.now()}`); if (result.ok) { setSelectedId(result.data.run.id); await refresh(); } else setError(result.error); setBusy(false); }
  function capturePending(value: Record<string, unknown>) { const commandId = pickString(value, "commandId"); const proposalId = pickString(value, "proposalId"); if (commandId && proposalId) setPending({ commandId, proposalId }); }
  async function sendCommand(raw = command) { if (!selectedId) return; setBusy(true); const result = await flywheelService.command(selectedId, raw); if (result.ok) { capturePending(result.data); await refresh(); } else setError(result.error); setBusy(false); }
  async function approve() { if (!selectedId || !pending) return; setBusy(true); const result = await flywheelService.approve(selectedId, pending.commandId, pending.proposalId); if (result.ok) { setPending(null); await refresh(); } else setError(result.error); setBusy(false); }
  async function intervene(action: "pause" | "lower" | "safe-mode" | "terminate" | "evidence") { if (!selectedId) return; if (action === "lower") return sendCommand("PAUSE::FLYWHEEL::LOWER_AUTONOMY"); if (action === "evidence") return sendCommand("REQUEST_EVIDENCE::FLYWHEEL::STAGE"); setBusy(true); const result = await flywheelService.intervene(selectedId, action); if (result.ok) { capturePending(result.data); await refresh(); } else setError(result.error); setBusy(false); }

  return <OperatorShell><main className="space-y-4 p-4 sm:p-6" aria-labelledby="flywheel-title"><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.24em] text-op-accent">Governed operations</p><h1 id="flywheel-title" className="mt-1 text-2xl font-semibold text-op-text">Operator Flywheel</h1><p className="mt-1 max-w-2xl text-sm text-op-text-dim">Deterministic ten-stage execution with signed approvals, evidence, and bounded autonomy.</p></div><button type="button" onClick={createRun} disabled={busy} className="rounded-sm bg-op-accent px-4 py-2 text-sm font-semibold text-op-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-op-accent disabled:opacity-40">Create queued run</button></header>
    {offline && <div role="status" className="rounded-sm border border-op-amber p-3 text-sm text-op-amber">Offline — showing the last confirmed state.</div>}
    {error && <div role="alert" className="rounded-sm border border-op-danger p-3 text-sm text-op-danger">{error}</div>}
    {runs.length > 0 && <label className="block text-xs text-op-text-dim">Run<select value={selectedId ?? ""} onChange={(event) => setSelectedId(event.target.value)} className="ml-2 rounded-sm border border-op-border bg-op-bg px-2 py-1 text-op-text">{runs.map((run) => <option key={run.id} value={run.id}>{run.missionId} · {run.state}</option>)}</select></label>}
    <StageMap stages={stages} run={detail?.run ?? null} /><GovernanceSummary detail={detail} />
    {detail && <section className="grid gap-4 lg:grid-cols-3" aria-label="Run details"><div className="op-panel-raised rounded-sm p-4"><h2 className="text-xs font-semibold uppercase tracking-widest text-op-text">Progress</h2><p className="mt-3 text-sm text-op-text">{detail.executions.length} completed stage execution(s)</p><p className="mt-1 text-xs text-op-text-dim">Evidence: {detail.evidence.length} · Metrics: {detail.metrics.length}</p></div><div className="op-panel-raised rounded-sm p-4 lg:col-span-2"><h2 className="text-xs font-semibold uppercase tracking-widest text-op-text">Command</h2><div className="mt-3 flex gap-2"><input aria-label="Flywheel command" value={command} onChange={(event) => setCommand(event.target.value)} className="min-w-0 flex-1 rounded-sm border border-op-border bg-op-bg px-3 py-2 font-mono text-xs text-op-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-op-accent"/><button type="button" onClick={() => sendCommand()} disabled={busy} className="rounded-sm border border-op-accent px-3 py-2 text-xs font-semibold text-op-accent disabled:opacity-40">Submit</button></div></div></section>}
    <InterventionPanel disabled={!selectedId} busy={busy} onAction={intervene} />
    {pending && <section role="dialog" aria-modal="false" aria-labelledby="flywheel-approval-title" className="rounded-sm border border-op-amber bg-op-amber/5 p-4"><h2 id="flywheel-approval-title" className="text-sm font-semibold text-op-amber">Operator approval required</h2><p className="mt-1 text-xs text-op-text-dim">Proposal {pending.proposalId}</p><button type="button" onClick={approve} disabled={busy} className="mt-3 rounded-sm bg-op-amber px-3 py-2 text-xs font-semibold text-op-bg disabled:opacity-40">Issue signed approval</button></section>}
    <EventTimeline events={detail?.events ?? []} />
    {!detail && !error && <p role="status" className="py-10 text-center text-sm text-op-text-dim">No Flywheel runs yet. Create a queued run to begin.</p>}
  </main></OperatorShell>;
}

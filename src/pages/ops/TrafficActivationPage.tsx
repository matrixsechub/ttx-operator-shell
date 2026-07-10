import { useCallback, useState } from "react";
import { OperatorShell } from "../../components/OperatorShell";
import { StatusPill } from "../../components/StatusPill";
import { useApiResource } from "../../lib/useApiResource";
import { trafficActivationService } from "../../lib/trafficActivationService";

function GateRow({ label, met, current, target }: { label: string; met: boolean; current: number; target: number }) {
  return (
    <div className="flex items-center justify-between border-b border-op-border/40 py-2 text-xs">
      <span className="text-op-text-dim">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-op-text">
          {current}/{target}
        </span>
        <StatusPill tone={met ? "ok" : "warn"}>{met ? "met" : "open"}</StatusPill>
      </div>
    </div>
  );
}

export function TrafficActivationPage() {
  const { result, loading, refresh } = useApiResource(trafficActivationService.getOverview);
  const overview = result?.ok ? result.data.overview : null;

  const [campaignName, setCampaignName] = useState("");
  const [reason, setReason] = useState("operator_review");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const runAction = useCallback(
    async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
      setActionLoading(true);
      setActionMessage(null);
      const res = await fn();
      setActionLoading(false);
      if (res.ok) {
        setActionMessage("Action completed");
        refresh();
      } else {
        setActionMessage(res.error ?? "Action failed");
      }
    },
    [refresh],
  );

  return (
    <OperatorShell>
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-lg uppercase tracking-widest text-op-accent">Traffic Activation</h1>
          <p className="mt-1 text-xs text-op-text-dim">Organic acquisition loop — operator-gated only</p>
        </header>
        {loading && !overview ? (
          <div className="op-panel p-6 text-xs text-op-text-dim">Loading activation overview…</div>
        ) : !overview ? (
          <div className="op-panel p-6 text-xs text-op-danger">Activation overview unavailable</div>
        ) : (
          <>
            <section className="op-panel rounded-sm p-4">
              <h2 className="text-xs uppercase tracking-widest text-op-accent">Objective progress</h2>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div>
                  <GateRow
                    label="Total valid sessions"
                    met={overview.progress.gates.totalSessions?.met ?? false}
                    current={Number(overview.progress.gates.totalSessions?.current ?? 0)}
                    target={Number(overview.progress.gates.totalSessions?.target ?? 150)}
                  />
                  <GateRow
                    label="Qualified organic sessions"
                    met={overview.progress.gates.qualifiedOrganic?.met ?? false}
                    current={Number(overview.progress.gates.qualifiedOrganic?.current ?? 0)}
                    target={Number(overview.progress.gates.qualifiedOrganic?.target ?? 50)}
                  />
                  <GateRow
                    label="Organic source diversity"
                    met={overview.progress.gates.organicSources?.met ?? false}
                    current={Number(overview.progress.gates.organicSources?.current ?? 0)}
                    target={Number(overview.progress.gates.organicSources?.target ?? 3)}
                  />
                </div>
                <div className="text-xs text-op-text-dim">
                  <p>
                    Confidence: <span className="text-op-text">{overview.progress.confidence}</span>
                  </p>
                  <p className="mt-2">
                    Promotion-eligible winner:{" "}
                    <span className="text-op-text">{overview.progress.promotionEligibleWinner ?? "BLOCKED"}</span>
                  </p>
                  {overview.progress.blockers.length > 0 ? (
                    <p className="mt-2 text-op-warn">Blockers: {overview.progress.blockers.join(", ")}</p>
                  ) : (
                    <p className="mt-2 text-op-ok">All promotion gates met</p>
                  )}
                  {overview.safeMode.active ? (
                    <p className="mt-2 text-op-danger">Safe mode active: {overview.safeMode.blockers.join(", ")}</p>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="op-panel rounded-sm p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xs uppercase tracking-widest text-op-accent">Campaign control</h2>
                <button
                  type="button"
                  onClick={() => refresh()}
                  className="rounded-sm border border-op-border-bright px-2 py-1 text-[10px] uppercase tracking-widest text-op-text-dim"
                >
                  refresh
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Campaign name"
                  className="rounded-sm border border-op-border bg-op-bg px-2 py-1 text-xs"
                />
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason"
                  className="rounded-sm border border-op-border bg-op-bg px-2 py-1 text-xs"
                />
                <button
                  type="button"
                  disabled={actionLoading || !campaignName.trim()}
                  onClick={() =>
                    runAction(() =>
                      trafficActivationService.createCampaign({
                        name: campaignName,
                        reason,
                        targetChannels: ["linkedin", "reddit"],
                        destinationPath: "/",
                      }),
                    )
                  }
                  className="rounded-sm border border-op-accent/50 px-2 py-1 text-[10px] uppercase tracking-widest text-op-accent"
                >
                  create draft
                </button>
              </div>
              <ul className="mt-4 flex flex-col gap-2">
                {overview.campaigns.map((campaign) => (
                  <li
                    key={campaign.campaignId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-op-border/50 p-3 text-xs"
                  >
                    <div>
                      <span className="font-medium text-op-text">{campaign.name}</span>
                      <span className="ml-2 text-op-text-dim">{campaign.status}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {campaign.status === "DRAFT" ? (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() =>
                            runAction(() =>
                              trafficActivationService.submitCampaign(campaign.campaignId, { reason }),
                            )
                          }
                          className="rounded-sm border border-op-border-bright px-2 py-0.5 text-[10px] uppercase"
                        >
                          submit
                        </button>
                      ) : null}
                      {campaign.status === "READY_FOR_APPROVAL" || campaign.status === "APPROVED" ? (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() =>
                            runAction(() =>
                              trafficActivationService.approveCampaign(campaign.campaignId, { reason }),
                            )
                          }
                          className="rounded-sm border border-op-border-bright px-2 py-0.5 text-[10px] uppercase"
                        >
                          approve
                        </button>
                      ) : null}
                      {campaign.status === "APPROVED" ? (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() =>
                            runAction(() =>
                              trafficActivationService.activateCampaign(campaign.campaignId, { reason }),
                            )
                          }
                          className="rounded-sm border border-op-accent/50 px-2 py-0.5 text-[10px] uppercase text-op-accent"
                        >
                          activate
                        </button>
                      ) : null}
                      {campaign.status === "ACTIVE" ? (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() =>
                            runAction(() =>
                              trafficActivationService.generateAssets(campaign.campaignId, {
                                reason,
                                channels: campaign.targetChannels,
                              }),
                            )
                          }
                          className="rounded-sm border border-op-border-bright px-2 py-0.5 text-[10px] uppercase"
                        >
                          generate assets
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="op-panel rounded-sm p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xs uppercase tracking-widest text-op-accent">Daily queue</h2>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => runAction(() => trafficActivationService.generateQueue({ reason }))}
                  className="rounded-sm border border-op-accent/50 px-2 py-1 text-[10px] uppercase tracking-widest text-op-accent"
                >
                  generate queue
                </button>
              </div>
              <ul className="mt-3 flex flex-col gap-2">
                {overview.todayQueue.map((task) => (
                  <li key={task.taskId} className="rounded-sm border border-op-border/50 p-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-op-text">{task.title}</span>
                      <StatusPill tone="neutral">{task.status}</StatusPill>
                    </div>
                    <p className="mt-1 text-op-text-dim">{task.description}</p>
                    {task.status === "PENDING_APPROVAL" ? (
                      <div className="mt-2 flex gap-1">
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() =>
                            runAction(() => trafficActivationService.approveTask(task.taskId, { reason }))
                          }
                          className="rounded-sm border border-op-border-bright px-2 py-0.5 text-[10px] uppercase"
                        >
                          approve task
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() =>
                            runAction(() => trafficActivationService.completeTask(task.taskId, { reason }))
                          }
                          className="rounded-sm border border-op-accent/50 px-2 py-0.5 text-[10px] uppercase text-op-accent"
                        >
                          mark complete
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>

            <section className="op-panel rounded-sm p-4">
              <h2 className="text-xs uppercase tracking-widest text-op-accent">Channel evidence</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {overview.recommendations.map((rec) => (
                  <li key={rec.channel} className="rounded-sm border border-op-border/50 p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-op-text">{rec.channel}</span>
                      <span className="text-op-text-dim">score {rec.score}</span>
                    </div>
                    <p className="mt-1 text-op-text-dim">{rec.suggestedAction}</p>
                    <p className="mt-1 text-[10px] text-op-text-dim/80">{rec.reasonCodes.join(" · ")}</p>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
        {actionMessage ? <p className="text-xs text-op-text-dim">{actionMessage}</p> : null}
      </div>
    </OperatorShell>
  );
}

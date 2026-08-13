import type { FlywheelRun } from "../../../shared/flywheel/contracts";
import type { FlywheelStageDefinition } from "../../../shared/flywheel/stages";

export function StageMap({ stages, run }: { stages: FlywheelStageDefinition[]; run: FlywheelRun | null }) {
  return <section className="op-panel-raised rounded-sm p-4" aria-labelledby="flywheel-stage-map-title">
    <h2 id="flywheel-stage-map-title" className="text-xs font-semibold uppercase tracking-widest text-op-text">Ten-stage loop</h2>
    <ol className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
      {stages.map((stage) => {
        const active = run?.currentStage === stage.stageId;
        return <li key={stage.stageId} aria-current={active ? "step" : undefined} className={`rounded-sm border p-3 ${active ? "border-op-accent bg-op-accent/10" : "border-op-border bg-op-bg/40"}`}>
          <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-mono text-op-text-dim">{String(stage.numericOrder).padStart(2, "0")}</span><span className="text-[10px] uppercase text-op-text-dim">{stage.approvalPolicy}</span></div>
          <h3 className="mt-2 text-sm font-semibold text-op-text">{stage.displayName}</h3>
          <p className="mt-1 text-xs text-op-text-dim">{stage.description}</p>
          {active && <span className="mt-2 inline-block text-[10px] font-semibold uppercase tracking-wider text-op-accent">Current stage</span>}
        </li>;
      })}
    </ol>
  </section>;
}

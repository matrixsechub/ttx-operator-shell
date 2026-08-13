import type { FlywheelRun } from "../../shared/flywheel/contracts";

export function buildQueuedNextCycle(run: FlywheelRun, now: string, id: string): FlywheelRun {
  return {
    ...run,
    id,
    currentStage: "lead_generation",
    state: "queued",
    createdAt: now,
    updatedAt: now,
    startedAt: undefined,
    completedAt: undefined,
    approvalReceiptId: undefined,
    nextCycleRunId: undefined,
    terminationReason: undefined,
    idempotencyKey: `${run.idempotencyKey}:cycle:${run.id}`,
  };
}

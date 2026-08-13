export const FLYWHEEL_EVENT_TYPES = [
  "flywheel.run.created", "flywheel.run.started", "flywheel.run.paused", "flywheel.run.resumed",
  "flywheel.run.completed", "flywheel.run.failed", "flywheel.run.terminated",
  "flywheel.safe_mode.entered", "flywheel.safe_mode.exited", "flywheel.stage.queued",
  "flywheel.stage.started", "flywheel.stage.completed", "flywheel.stage.failed", "flywheel.stage.retry",
  "flywheel.command.received", "flywheel.command.accepted", "flywheel.command.denied",
  "flywheel.approval.recorded", "flywheel.evidence.requested", "flywheel.evidence.attached",
  "flywheel.cycle.proposed", "flywheel.kpi.threshold_breached",
] as const;
export type FlywheelEventType = (typeof FLYWHEEL_EVENT_TYPES)[number];

export const FLYWHEEL_STAGE_IDS = [
  "lead_generation",
  "lead_qualification",
  "personalized_outreach",
  "content_automation",
  "nurture_sequences",
  "sales_automation",
  "service_delivery",
  "optimization_loop",
  "scaling_workflows",
  "continuous_improvement",
] as const;

export type FlywheelStageId = (typeof FLYWHEEL_STAGE_IDS)[number];
export type FlywheelStageState =
  | "idle" | "queued" | "awaiting_approval" | "running" | "paused"
  | "blocked" | "failed" | "completed" | "safe_mode";
export type FlywheelRiskLevel = "low" | "medium" | "high" | "critical";
export type FlywheelActionClass = "C0" | "C1" | "C2" | "C3" | "C4" | "C5" | "C6";
export type FlywheelCommandCategory =
  | "ANALYZE" | "SCAN" | "GENERATE" | "SYNTH" | "DEPLOY"
  | "LOOP" | "PAUSE" | "RESUME" | "TERMINATE" | "REQUEST_EVIDENCE";

export interface FlywheelRun {
  id: string;
  missionId: string;
  tenantId: string;
  currentStage: FlywheelStageId;
  state: FlywheelStageState;
  autonomyLevel: 0 | 1 | 2;
  riskLevel: FlywheelRiskLevel;
  beaconVersion: string;
  beaconSha256: string;
  approvalReceiptId?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  traceId: string;
  idempotencyKey: string;
  nextCycleRunId?: string;
  terminationReason?: string;
}

export interface FlywheelStageExecution {
  executionId: string;
  runId: string;
  stageId: FlywheelStageId;
  inputArtifactRefs: string[];
  outputArtifactRefs: string[];
  state: FlywheelStageState;
  retryCount: number;
  maxRetries: number;
  startedAt?: string;
  completedAt?: string;
  latencyMs?: number;
  errorCode?: string;
  evidenceRefs: string[];
  operatorDecision?: "approved" | "denied" | "not_required";
}

export interface FlywheelCommand {
  commandId: string;
  raw: string;
  category: FlywheelCommandCategory;
  target: string;
  parameter: string;
  payload: Record<string, unknown>;
  requestedBy: string;
  missionId: string;
  traceId: string;
  idempotencyKey: string;
  requestedAt: string;
  actionClass: FlywheelActionClass;
}

export interface FlywheelApprovalReceipt {
  receiptId: string;
  missionId: string;
  commandId: string;
  approvedBy: string;
  approvalScope: string;
  approvedAt: string;
  expiresAt: string;
  beaconSha256: string;
  governanceApprovalId: string;
  proposalId: string;
}

export interface FlywheelMetric {
  eventId: string;
  runId: string;
  stageId: FlywheelStageId;
  metricName: string;
  metricValue: number;
  unit: string;
  target?: number;
  status: "on_track" | "at_risk" | "breached" | "unknown";
  timestamp: string;
  traceId: string;
}

export interface FlywheelEvidence {
  evidenceId: string;
  runId: string;
  stageId: FlywheelStageId;
  artifactRef: string;
  sha256: string;
  attachedAt: string;
  attachedBy: string;
}

export interface FlywheelEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  tenantId: string;
  missionId: string;
  runId: string;
  stageId?: FlywheelStageId;
  traceId: string;
  actorType: "operator" | "agent" | "system";
  actorId: string;
  governanceDecision: "allowed" | "denied" | "approval_required" | "approved";
  latencyMs?: number;
  metadata: Record<string, unknown>;
}

export interface FlywheelRunDetail {
  run: FlywheelRun;
  executions: FlywheelStageExecution[];
  metrics: FlywheelMetric[];
  evidence: FlywheelEvidence[];
  events: FlywheelEvent[];
  governance: {
    beaconActive: boolean;
    approvalState: "not_required" | "required" | "approved";
    safeMode: boolean;
  };
}

export interface FlywheelApiMeta { traceId: string; timestamp: string; version: "1.0" }
export interface FlywheelApiSuccess<T> { ok: true; data: T; meta: FlywheelApiMeta }
export interface FlywheelApiError {
  ok: false;
  error: { code: string; message: string; retryable: boolean; details: Record<string, unknown> };
  meta: FlywheelApiMeta;
}
export type FlywheelApiResponse<T> = FlywheelApiSuccess<T> | FlywheelApiError;

export const SHA256_PATTERN = /^[a-f0-9]{64}$/;
export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
export function isSha256(value: unknown): value is string {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}
export function validateRunCreate(value: unknown): { valid: true; value: Record<string, unknown> } | { valid: false; errors: string[] } {
  if (!isRecord(value)) return { valid: false, errors: ["body must be an object"] };
  const errors: string[] = [];
  if (typeof value.missionId !== "string" || !value.missionId.trim()) errors.push("missionId is required");
  if (typeof value.idempotencyKey !== "string" || !value.idempotencyKey.trim()) errors.push("idempotencyKey is required");
  if (value.tenantId !== undefined && typeof value.tenantId !== "string") errors.push("tenantId must be a string");
  return errors.length ? { valid: false, errors } : { valid: true, value };
}

export type ValidationResult<T> = { valid: true; value: T } | { valid: false; errors: string[] };
function requiredStrings(value: Record<string, unknown>, fields: string[]): string[] {
  return fields.filter((field) => typeof value[field] !== "string" || !(value[field] as string).trim()).map((field) => `${field} is required`);
}
export function validateFlywheelCommand(value: unknown): ValidationResult<FlywheelCommand> {
  if (!isRecord(value)) return { valid: false, errors: ["command must be an object"] };
  const errors = requiredStrings(value, ["commandId", "raw", "category", "target", "parameter", "requestedBy", "missionId", "traceId", "idempotencyKey", "requestedAt", "actionClass"]);
  if (!isRecord(value.payload)) errors.push("payload must be an object");
  return errors.length ? { valid: false, errors } : { valid: true, value: value as unknown as FlywheelCommand };
}
export function validateFlywheelApproval(value: unknown): ValidationResult<Pick<FlywheelApprovalReceipt, "commandId" | "proposalId">> {
  if (!isRecord(value)) return { valid: false, errors: ["approval must be an object"] };
  const errors = requiredStrings(value, ["commandId", "proposalId"]);
  return errors.length ? { valid: false, errors } : { valid: true, value: { commandId: String(value.commandId), proposalId: String(value.proposalId) } };
}
export function validateFlywheelEvent(value: unknown): ValidationResult<FlywheelEvent> {
  if (!isRecord(value)) return { valid: false, errors: ["event must be an object"] };
  const errors = requiredStrings(value, ["eventId", "eventType", "timestamp", "tenantId", "missionId", "runId", "traceId", "actorType", "actorId", "governanceDecision"]);
  if (!isRecord(value.metadata)) errors.push("metadata must be an object");
  return errors.length ? { valid: false, errors } : { valid: true, value: value as unknown as FlywheelEvent };
}
export function validateFlywheelEvidence(value: unknown): ValidationResult<FlywheelEvidence> {
  if (!isRecord(value)) return { valid: false, errors: ["evidence must be an object"] };
  const errors = requiredStrings(value, ["evidenceId", "runId", "stageId", "artifactRef", "sha256", "attachedAt", "attachedBy"]);
  if (typeof value.sha256 === "string" && !isSha256(value.sha256)) errors.push("sha256 must be 64 lowercase hexadecimal characters");
  return errors.length ? { valid: false, errors } : { valid: true, value: value as unknown as FlywheelEvidence };
}

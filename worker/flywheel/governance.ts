import type { FlywheelCommand, FlywheelRun } from "../../shared/flywheel/contracts";
import { stageFromTarget } from "../../shared/flywheel/stages";
import type { ActionProposal, BeaconReleaseEnv } from "./mainCompat";
import { defaultNorthstarImpact, getCodexManifestSnapshot, resolveBeaconRuntimeState } from "./mainCompat";

export const FLYWHEEL_DENIAL_CODES = [
  "GOVERNANCE_MISSING_BEACON", "GOVERNANCE_HASH_INVALID", "GOVERNANCE_APPROVAL_REQUIRED",
  "GOVERNANCE_APPROVAL_EXPIRED", "GOVERNANCE_SCOPE_MISMATCH", "GOVERNANCE_AUTONOMY_EXCEEDED",
  "GOVERNANCE_RISK_EXCEEDED", "GOVERNANCE_INVALID_TRANSITION", "GOVERNANCE_DUPLICATE_COMMAND",
  "GOVERNANCE_TENANT_MISMATCH", "GOVERNANCE_EVIDENCE_MISSING", "GOVERNANCE_SAFE_MODE_ACTIVE",
] as const;

export interface FlywheelGovernanceDecision { allowed: boolean; approvalRequired: boolean; code?: string; reason: string }
export async function evaluateFlywheelGovernance(
  env: BeaconReleaseEnv,
  tenantId: string,
  run: FlywheelRun,
  command: FlywheelCommand,
): Promise<FlywheelGovernanceDecision> {
  if (run.tenantId !== tenantId) return { allowed: false, approvalRequired: false, code: "GOVERNANCE_TENANT_MISMATCH", reason: "Tenant scope does not match the run." };
  if (command.missionId !== run.missionId) return { allowed: false, approvalRequired: false, code: "GOVERNANCE_SCOPE_MISMATCH", reason: "Mission scope does not match the run." };
  if (command.category === "DEPLOY") return { allowed: false, approvalRequired: true, code: "PRODUCTION_DEPLOY_NOT_AUTHORIZED", reason: "Deployment is disabled for Flywheel v1." };
  if (run.state === "safe_mode" && !["ANALYZE", "REQUEST_EVIDENCE", "RESUME"].includes(command.category)) return { allowed: false, approvalRequired: false, code: "GOVERNANCE_SAFE_MODE_ACTIVE", reason: "Material execution is blocked in safe mode." };
  if (["completed", "failed", "blocked"].includes(run.state) && command.category !== "ANALYZE") return { allowed: false, approvalRequired: false, code: "GOVERNANCE_INVALID_TRANSITION", reason: "The run is not in an executable state." };
  if (command.category === "RESUME" && command.parameter !== "NEXT_CYCLE" && !["paused", "safe_mode"].includes(run.state)) return { allowed: false, approvalRequired: false, code: "GOVERNANCE_INVALID_TRANSITION", reason: "Only paused or safe-mode runs can resume." };
  if (command.category === "RESUME" && command.parameter === "NEXT_CYCLE" && run.state !== "queued") return { allowed: false, approvalRequired: false, code: "GOVERNANCE_INVALID_TRANSITION", reason: "Only a queued proposed cycle can be activated." };
  if (command.category === "RESUME" && command.parameter === "NEXT_CYCLE" && (!Array.isArray(command.payload.evidenceRefs) || command.payload.evidenceRefs.length === 0)) return { allowed: false, approvalRequired: true, code: "GOVERNANCE_EVIDENCE_MISSING", reason: "Fresh evidence is required to activate a proposed cycle." };
  if (command.target.startsWith("STAGE_") && stageFromTarget(command.target)?.stageId !== run.currentStage) return { allowed: false, approvalRequired: false, code: "GOVERNANCE_INVALID_TRANSITION", reason: "Command target is not the current stage." };
  if (run.autonomyLevel > 1) return { allowed: false, approvalRequired: false, code: "GOVERNANCE_AUTONOMY_EXCEEDED", reason: "V1 autonomy ceiling is bounded level 1." };
  const beacon = await resolveBeaconRuntimeState(env);
  if (!beacon.hash) return { allowed: false, approvalRequired: false, code: "GOVERNANCE_MISSING_BEACON", reason: "Beacon hash is unavailable." };
  if (beacon.hash !== run.beaconSha256) return { allowed: false, approvalRequired: false, code: "GOVERNANCE_HASH_INVALID", reason: "Beacon drift detected." };
  const approvalRequired = Number(command.actionClass.slice(1)) >= 2;
  if (approvalRequired && beacon.status !== "verified_v2") return { allowed: false, approvalRequired: true, code: "GOVERNANCE_MISSING_BEACON", reason: "Signed Beacon v2 is required for material execution." };
  return { allowed: true, approvalRequired, reason: approvalRequired ? "Signed operator approval is required." : "Command is within bounded policy." };
}

export async function buildFlywheelProposal(run: FlywheelRun, command: FlywheelCommand, beaconHash: string): Promise<ActionProposal> {
  const codex = await getCodexManifestSnapshot();
  const risk = command.actionClass === "C3" ? { numeric: 70, qualitative: "high" as const } : { numeric: 45, qualitative: "medium" as const };
  return {
    proposal_id: `flywheel-${command.commandId}`,
    revision: 1,
    created_by: command.requestedBy,
    created_at: new Date().toISOString(),
    target_system: `flywheel:${run.tenantId}:${run.id}`,
    action_class: command.actionClass,
    summary: `Execute ${command.raw} for Flywheel run ${run.id}`,
    intended_outcome: "Advance or intervene in the governed Flywheel run using the deterministic v1 adapter.",
    northstar_impact: defaultNorthstarImpact("CONTROLLED_GROWTH"),
    evidence_refs: Array.isArray(command.payload.evidenceRefs) ? command.payload.evidenceRefs.filter((value): value is string => typeof value === "string").slice(0, 20) : [],
    risk_score: risk,
    rollback_plan: `Restore Flywheel run ${run.id} from its preceding Durable Object state snapshot.`,
    affected_data: ["flywheel_run", "flywheel_command", "flywheel_telemetry"],
    affected_users: "internal",
    required_approver: "operator",
    beacon_hash: beaconHash,
    codex_hash: codex.manifestHash,
    expiration: new Date(Date.now() + 15 * 60_000).toISOString(),
    status: "pending",
    action_payload: { runId: run.id, commandId: command.commandId, raw: command.raw, payload: command.payload },
  };
}

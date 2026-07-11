import type { GovernedMutationInput, GovernedMutationResult } from "./types";
import { requiresFailClosedAudit } from "./types";
import { verifyApprovalForExecution, resolveExecutionSigning } from "./approvalVerifier";
import { digestInputFromProposal } from "./actionDigest";
import { getProposal, updateProposalStatus } from "./proposalStore";
import { getExecutionByIdempotencyKey, saveExecutionReceipt } from "./executionStore";
import { buildExecutionReceipt, computeResultDigest } from "./executionReceipt";
import { buildAuditBundle } from "./auditBundle";
import { recordAuditEvent, type AuditDbEnv } from "./auditStore";
import { buildTelemetryEvent, emitGovernanceTelemetry } from "./governanceTelemetry";
import { getCodexManifestSnapshot } from "../codex/manifestHash";
import { resolveBeaconRuntimeState } from "./beaconRuntime";
import type { AuthEnv } from "../auth";
import type { RuntimeEnvSource } from "./runtimeEnv";
import { createReceiptAuthorityClient, type ReceiptAuthorityEnv } from "./receiptAuthorityClient";
import {
  actionClassAllowed,
  evaluateGovernanceHealth,
  requiresGovernedHealthGate,
  type GovernanceHealthEnv,
} from "./governanceHealth";
import type { SigningKeyEnv } from "./signingKeys";

export type GovernedExecutionEnv = AuditDbEnv &
  AuthEnv &
  RuntimeEnvSource &
  SigningKeyEnv &
  ReceiptAuthorityEnv &
  GovernanceHealthEnv;

export async function runGovernedMutation<TInput, TResult>(
  env: GovernedExecutionEnv,
  mutation: GovernedMutationInput<TInput>,
): Promise<GovernedMutationResult<TResult>> {
  const correlationId = crypto.randomUUID();
  const codex = await getCodexManifestSnapshot();
  const beacon = await resolveBeaconRuntimeState(env);
  const signing = resolveExecutionSigning(env);
  const startedAt = new Date().toISOString();
  const receiptAuthority = createReceiptAuthorityClient(env);

  const health = await evaluateGovernanceHealth(env);
  if (requiresGovernedHealthGate(mutation.actionClass) && !actionClassAllowed(health, mutation.actionClass)) {
    return {
      ok: false,
      code: "GOVERNANCE_HEALTH_BLOCKED",
      error: `Governance blocked: ${health.reasonCodes.join(", ")}`,
    };
  }

  if (!signing) {
    return { ok: false, code: "GOVERNANCE_SIGNING_KEY_MISSING", error: "Governance receipt signing key not configured" };
  }

  const existing = await getExecutionByIdempotencyKey(env, mutation.idempotencyKey);
  if (existing) {
    await emitGovernanceTelemetry(
      env,
      buildTelemetryEvent("governance.execution.replay_blocked", {
        proposalId: mutation.proposalId,
        approvalId: mutation.approvalId,
        executionId: existing.executionId,
        beaconHash: beacon.hash ?? "unknown",
        codexHash: codex.manifestHash,
        environment: mutation.environment,
        actionClass: mutation.actionClass,
        outcome: "idempotent_replay",
        reasonCode: "IDEMPOTENCY_REPLAY",
        correlationId,
      }),
    );
    return {
      ok: existing.status === "succeeded",
      result: undefined,
      executionReceipt: existing,
      code: "IDEMPOTENCY_REPLAY",
      error: existing.status === "succeeded" ? undefined : existing.errorCode ?? "prior execution failed",
    };
  }

  const proposal = await getProposal(env, mutation.proposalId);
  if (!proposal) {
    return { ok: false, code: "PROPOSAL_NOT_FOUND", error: "Proposal not found" };
  }

  const actionDigestInput = digestInputFromProposal(
    proposal,
    mutation.actionType,
    mutation.environment,
    mutation.input as Record<string, unknown>,
  );

  const verification = await verifyApprovalForExecution(env, {
    proposalId: mutation.proposalId,
    approvalId: mutation.approvalId,
    actionDigestInput,
    environment: mutation.environment,
    signing,
  });

  if (!verification.valid || !verification.receipt) {
    await emitGovernanceTelemetry(
      env,
      buildTelemetryEvent("governance.receipt.rejected", {
        proposalId: mutation.proposalId,
        approvalId: mutation.approvalId,
        beaconHash: beacon.hash ?? "unknown",
        codexHash: codex.manifestHash,
        environment: mutation.environment,
        actionClass: mutation.actionClass,
        outcome: "rejected",
        reasonCode: verification.code,
        correlationId,
      }),
    );
    return { ok: false, code: verification.code, error: verification.reason };
  }

  const executionId = crypto.randomUUID();
  const reserve = await receiptAuthority.reserve({
    approvalId: mutation.approvalId,
    nonce: verification.receipt.nonce,
    actionDigest: verification.actionDigest ?? verification.receipt.actionDigest,
    idempotencyKey: mutation.idempotencyKey,
    executionId,
    expiresAt: verification.receipt.expiresAt,
  });

  if (reserve.status === "already_completed") {
    const prior = await getExecutionByIdempotencyKey(env, mutation.idempotencyKey);
    if (prior) {
      return {
        ok: prior.status === "succeeded",
        executionReceipt: prior,
        code: "IDEMPOTENCY_REPLAY",
      };
    }
  }
  if (reserve.status === "expired") {
    return { ok: false, code: "RECEIPT_EXPIRED", error: "Approval receipt expired" };
  }
  if (reserve.status === "conflict" || reserve.status === "in_progress") {
    return {
      ok: false,
      code: reserve.status === "conflict" ? reserve.reasonCode : "RECEIPT_IN_PROGRESS",
      error: reserve.status === "conflict" ? reserve.reasonCode : "Receipt execution in progress",
    };
  }
  if (reserve.status !== "reserved") {
    return { ok: false, code: "RECEIPT_RESERVE_FAILED", error: "Receipt reservation failed" };
  }

  const failClosed = requiresFailClosedAudit(mutation.actionClass);

  try {
    await recordAuditEvent(
      env,
      {
        event_id: crypto.randomUUID(),
        timestamp: startedAt,
        actor_type: "operator",
        actor_id: verification.receipt.approvedBy,
        action_class: mutation.actionClass,
        system_target: proposal.target_system,
        beacon_hash: beacon.hash ?? proposal.beacon_hash,
        codex_hash: codex.manifestHash,
        trace_id: correlationId,
        proposal_id: mutation.proposalId,
        approval_id: mutation.approvalId,
        execution_id: executionId,
        event_type: "governance.execution.attempted",
        correlation_id: correlationId,
        risk_score: proposal.risk_score.numeric,
        result: "success",
        rollback_ref: mutation.rollbackReference,
      },
      { failClosed },
    );
  } catch {
    await receiptAuthority.fail({
      approvalId: mutation.approvalId,
      executionId,
      errorCode: "PRE_EXECUTION_AUDIT_FAILED",
    });
    return { ok: false, code: "PRE_EXECUTION_AUDIT_FAILED", error: "Pre-execution audit write failed" };
  }

  await emitGovernanceTelemetry(
    env,
    buildTelemetryEvent("governance.execution.started", {
      proposalId: mutation.proposalId,
      approvalId: mutation.approvalId,
      executionId,
      beaconHash: beacon.hash ?? "unknown",
      codexHash: codex.manifestHash,
      environment: mutation.environment,
      actionClass: mutation.actionClass,
      outcome: "started",
      correlationId,
    }),
  );

  let status: "succeeded" | "failed" | "audit_incomplete" = "succeeded";
  let result: unknown;
  let errorCode: string | undefined;

  try {
    result = await mutation.execute();
  } catch (error) {
    status = "failed";
    errorCode = error instanceof Error ? error.message : "execution_failed";
  }

  const completedAt = new Date().toISOString();
  const resultDigest = status === "succeeded" ? await computeResultDigest(result) : undefined;
  const bundle = await buildAuditBundle(env, mutation.proposalId, proposal, verification.receipt, null);

  const executionReceipt = buildExecutionReceipt({
    executionId,
    proposalId: mutation.proposalId,
    approvalId: mutation.approvalId,
    actionDigest: verification.actionDigest ?? "",
    beaconHash: beacon.hash ?? proposal.beacon_hash,
    codexHash: codex.manifestHash,
    environment: mutation.environment,
    idempotencyKey: mutation.idempotencyKey,
    status,
    startedAt,
    completedAt,
    resultDigest,
    errorCode,
    rollbackReference: mutation.rollbackReference,
    auditBundleId: bundle.auditBundleId,
  });

  await saveExecutionReceipt(env, executionReceipt);

  if (status === "succeeded" && resultDigest) {
    await receiptAuthority.complete({
      approvalId: mutation.approvalId,
      executionId,
      resultDigest,
    });
  } else if (status === "failed") {
    await receiptAuthority.fail({
      approvalId: mutation.approvalId,
      executionId,
      errorCode: errorCode ?? "execution_failed",
    });
  }

  try {
    await recordAuditEvent(
      env,
      {
        event_id: crypto.randomUUID(),
        timestamp: completedAt,
        actor_type: "operator",
        actor_id: verification.receipt.approvedBy,
        action_class: mutation.actionClass,
        system_target: proposal.target_system,
        beacon_hash: beacon.hash ?? proposal.beacon_hash,
        codex_hash: codex.manifestHash,
        trace_id: correlationId,
        proposal_id: mutation.proposalId,
        approval_id: mutation.approvalId,
        execution_id: executionId,
        event_type: status === "succeeded" ? "governance.execution.succeeded" : "governance.execution.failed",
        correlation_id: correlationId,
        reason_code: errorCode,
        risk_score: proposal.risk_score.numeric,
        result: status === "succeeded" ? "success" : "failure",
        rollback_ref: mutation.rollbackReference,
        evidence_hash: resultDigest,
      },
      { failClosed: false },
    );
  } catch {
    executionReceipt.status = "audit_incomplete";
    await saveExecutionReceipt(env, executionReceipt);
    status = "audit_incomplete";
  }

  if (status === "succeeded") {
    await updateProposalStatus(env, mutation.proposalId, "executed");
  }

  await emitGovernanceTelemetry(
    env,
    buildTelemetryEvent("governance.receipt.consumed", {
      proposalId: mutation.proposalId,
      approvalId: mutation.approvalId,
      executionId,
      beaconHash: beacon.hash ?? "unknown",
      codexHash: codex.manifestHash,
      environment: mutation.environment,
      actionClass: mutation.actionClass,
      outcome: status,
      correlationId,
    }),
  );

  return {
    ok: status === "succeeded",
    result: status === "succeeded" ? (result as TResult) : undefined,
    executionReceipt,
    error: status === "succeeded" ? undefined : errorCode,
    code: status === "succeeded" ? undefined : errorCode,
  };
}

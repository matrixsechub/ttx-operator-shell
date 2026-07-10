import type { ExecutionReceipt } from "./types";
import { hashCanonicalPayload } from "./receiptCrypto";

export function buildExecutionReceipt(
  fields: Omit<ExecutionReceipt, "executionId"> & { executionId?: string },
): ExecutionReceipt {
  return {
    executionId: fields.executionId ?? crypto.randomUUID(),
    proposalId: fields.proposalId,
    approvalId: fields.approvalId,
    actionDigest: fields.actionDigest,
    beaconHash: fields.beaconHash,
    codexHash: fields.codexHash,
    environment: fields.environment,
    idempotencyKey: fields.idempotencyKey,
    status: fields.status,
    startedAt: fields.startedAt,
    completedAt: fields.completedAt,
    resultDigest: fields.resultDigest,
    errorCode: fields.errorCode,
    rollbackReference: fields.rollbackReference,
    auditBundleId: fields.auditBundleId,
  };
}

export async function computeResultDigest(result: unknown): Promise<string> {
  return hashCanonicalPayload({ result });
}

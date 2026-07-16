import type { ActionProposal, ApprovalReceipt, AuditEvent } from "./types";
import type { ExecutionReceipt } from "./types";
import { listAuditEventsForProposal } from "./auditStore";

export interface AuditBundle {
  auditBundleId: string;
  proposalId: string;
  generatedAt: string;
  proposal: ActionProposal | null;
  receipt: ApprovalReceipt | null;
  execution: ExecutionReceipt | null;
  auditEvents: AuditEvent[];
}

export async function buildAuditBundle(
  env: Parameters<typeof listAuditEventsForProposal>[0],
  proposalId: string,
  proposal: ActionProposal | null,
  receipt: ApprovalReceipt | null,
  execution: ExecutionReceipt | null = null,
): Promise<AuditBundle> {
  const auditEvents = await listAuditEventsForProposal(env, proposalId);
  return {
    auditBundleId: crypto.randomUUID(),
    proposalId,
    generatedAt: new Date().toISOString(),
    proposal,
    receipt,
    execution,
    auditEvents,
  };
}

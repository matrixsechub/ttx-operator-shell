import type { ActionProposal, ApprovalReceipt } from "./types";
import { signApprovalReceipt } from "./receiptCrypto";
import type { ResolvedSigningKey } from "./signingKeys";

export function buildReceiptFromProposal(
  proposal: ActionProposal,
  fields: {
    approvalId: string;
    actionDigest: string;
    approvedBy: string;
    approvedAt: string;
    expiresAt: string;
    nonce: string;
    targetEnvironment: ApprovalReceipt["targetEnvironment"];
  },
): Omit<ApprovalReceipt, "signature"> {
  return {
    approvalId: fields.approvalId,
    proposalId: proposal.proposal_id,
    proposalRevision: proposal.revision,
    actionClass: proposal.action_class,
    actionDigest: fields.actionDigest,
    beaconHash: proposal.beacon_hash,
    codexHash: proposal.codex_hash,
    targetEnvironment: fields.targetEnvironment,
    approvedBy: fields.approvedBy,
    approvedAt: fields.approvedAt,
    expiresAt: fields.expiresAt,
    nonce: fields.nonce,
  };
}

export async function finalizeApprovalReceipt(
  unsigned: Omit<ApprovalReceipt, "signature">,
  signing: ResolvedSigningKey,
): Promise<ApprovalReceipt> {
  const signature = await signApprovalReceipt(unsigned, signing);
  return { ...unsigned, signature };
}

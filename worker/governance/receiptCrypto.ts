import type { ApprovalReceipt } from "./types";
import {
  BEACON_RELEASE_DOMAIN,
  GOVERNANCE_RECEIPT_DOMAIN,
  type ResolvedSigningKey,
} from "./signingKeys";

export async function hashCanonicalPayload(payload: unknown): Promise<string> {
  const canonical = JSON.stringify(payload);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashProposalAction(
  proposal: {
    proposal_id: string;
    revision: number;
    target_system: string;
    action_class: string;
    rollback_plan: string;
    action_payload?: Record<string, unknown>;
  },
  actionType: string,
  environment: string,
  mutationPayload: Record<string, unknown> = proposal.action_payload ?? {},
): Promise<string> {
  return hashCanonicalPayload({
    actionType,
    actionClass: proposal.action_class,
    targetEnvironment: environment,
    targetResource: proposal.target_system,
    mutationPayload,
    rollbackReference: proposal.rollback_plan,
    proposalRevision: proposal.revision,
    proposalId: proposal.proposal_id,
  });
}

function buildReceiptSignPayload(
  receipt: Omit<ApprovalReceipt, "signature">,
  signing: ResolvedSigningKey,
): string {
  return JSON.stringify({
    domain: signing.domain,
    keyId: signing.keyId,
    approvalId: receipt.approvalId,
    proposalId: receipt.proposalId,
    proposalRevision: receipt.proposalRevision,
    actionClass: receipt.actionClass,
    actionDigest: receipt.actionDigest,
    beaconHash: receipt.beaconHash,
    codexHash: receipt.codexHash,
    targetEnvironment: receipt.targetEnvironment,
    approvedBy: receipt.approvedBy,
    approvedAt: receipt.approvedAt,
    expiresAt: receipt.expiresAt,
    nonce: receipt.nonce,
  });
}

async function hmacSign(payload: string, signingKey: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type UnsignedApprovalReceipt = Omit<ApprovalReceipt, "signature">;

export async function signApprovalReceipt(
  receipt: UnsignedApprovalReceipt,
  signing: ResolvedSigningKey,
): Promise<string> {
  if (signing.domain !== GOVERNANCE_RECEIPT_DOMAIN) {
    throw new Error("invalid signing domain for governance receipt");
  }
  return hmacSign(buildReceiptSignPayload(receipt, signing), signing.key);
}

export async function verifyApprovalReceiptSignature(
  receipt: ApprovalReceipt,
  signing: ResolvedSigningKey,
): Promise<boolean> {
  if (signing.domain !== GOVERNANCE_RECEIPT_DOMAIN) {
    return false;
  }
  const { signature, ...unsigned } = receipt;
  const expected = await signApprovalReceipt(unsigned, signing);
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function verifyApprovalReceiptWithWrongDomain(
  receipt: ApprovalReceipt,
  signing: ResolvedSigningKey,
): Promise<boolean> {
  if (signing.domain === GOVERNANCE_RECEIPT_DOMAIN) return false;
  const wrongDomainSigning = { ...signing, domain: BEACON_RELEASE_DOMAIN };
  const { signature, ...unsigned } = receipt;
  const expected = await hmacSign(buildReceiptSignPayload(unsigned, wrongDomainSigning), signing.key);
  return expected === signature;
}

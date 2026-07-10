import type { ActionProposal, ApprovalReceipt, RuntimeEnvironment } from "./types";
import { computeActionDigest, type ActionDigestInput } from "./actionDigest";
import { getCodexManifestSnapshot } from "../codex/manifestHash";
import { resolveBeaconRuntimeState } from "./beaconRuntime";
import { getProposal, getApprovalReceipt } from "./proposalStore";
import { verifyApprovalReceiptSignature } from "./receiptCrypto";
import { resolveGovernanceReceiptSigningKey, type ResolvedSigningKey, type SigningKeyEnv } from "./signingKeys";
import { validateApprovalReceiptSchema } from "./receiptSchema";
import type { ReceiptAuthorityEnv } from "./receiptAuthorityClient";
import type { BeaconReleaseEnv } from "../beacon/beaconRelease";

export interface ApprovalVerificationInput {
  proposalId: string;
  approvalId: string;
  actionDigestInput: ActionDigestInput;
  environment: RuntimeEnvironment;
  signing: ResolvedSigningKey;
}

export interface ApprovalVerificationResult {
  valid: boolean;
  reason: string;
  code?: string;
  proposal?: ActionProposal;
  receipt?: ApprovalReceipt;
  actionDigest?: string;
}

export async function verifyApprovalForExecution(
  env: Parameters<typeof getProposal>[0] & BeaconReleaseEnv & SigningKeyEnv & ReceiptAuthorityEnv,
  input: ApprovalVerificationInput,
): Promise<ApprovalVerificationResult> {
  const [proposal, receipt, beaconState, codex] = await Promise.all([
    getProposal(env, input.proposalId),
    getApprovalReceipt(env, input.approvalId),
    resolveBeaconRuntimeState(env),
    getCodexManifestSnapshot(),
  ]);

  if (beaconState.status !== "verified_v2") {
    return {
      valid: false,
      reason: beaconState.status === "legacy_v1" ? "Signed beacon v2 not active" : "Beacon invalid",
      code: beaconState.status === "legacy_v1" ? "SIGNED_BEACON_NOT_ACTIVE" : "BEACON_UNVERIFIED",
    };
  }
  if (!proposal) return { valid: false, reason: "Proposal not found", code: "PROPOSAL_NOT_FOUND" };
  if (!receipt) return { valid: false, reason: "Approval receipt not found", code: "RECEIPT_NOT_FOUND" };

  const schema = validateApprovalReceiptSchema(receipt);
  if (!schema.valid) {
    return { valid: false, reason: schema.errors.join(", "), code: "RECEIPT_SCHEMA_INVALID" };
  }

  if (receipt.proposalId !== input.proposalId) {
    return { valid: false, reason: "Receipt proposal mismatch", code: "RECEIPT_PROPOSAL_MISMATCH" };
  }
  if (proposal.status !== "approved" && proposal.status !== "executed") {
    return { valid: false, reason: "Proposal not approved", code: "PROPOSAL_NOT_APPROVED" };
  }
  if (receipt.proposalRevision !== proposal.revision) {
    return { valid: false, reason: "Proposal revision mismatch", code: "PROPOSAL_REVISION_MISMATCH" };
  }
  if (Date.parse(receipt.expiresAt) <= Date.now()) {
    return { valid: false, reason: "Approval receipt expired", code: "RECEIPT_EXPIRED" };
  }
  if (receipt.targetEnvironment !== input.environment) {
    return { valid: false, reason: "Environment mismatch", code: "ENVIRONMENT_MISMATCH" };
  }
  if (receipt.beaconHash !== beaconState.hash) {
    return { valid: false, reason: "Beacon drift detected", code: "BEACON_DRIFT" };
  }
  if (receipt.codexHash !== codex.manifestHash) {
    return { valid: false, reason: "Codex drift detected", code: "CODEX_DRIFT" };
  }

  const actionDigest = await computeActionDigest(input.actionDigestInput);
  if (receipt.actionDigest !== actionDigest) {
    return {
      valid: false,
      reason: "Action digest mismatch",
      code: "ACTION_DIGEST_MISMATCH",
      proposal,
      receipt,
      actionDigest,
    };
  }

  const signatureValid = await verifyApprovalReceiptSignature(receipt, input.signing);
  if (!signatureValid) {
    return { valid: false, reason: "Invalid receipt signature", code: "RECEIPT_SIGNATURE_INVALID" };
  }

  return {
    valid: true,
    reason: "Receipt verified",
    proposal,
    receipt,
    actionDigest,
  };
}

export function resolveExecutionSigning(env: SigningKeyEnv): ResolvedSigningKey | null {
  return resolveGovernanceReceiptSigningKey(env);
}

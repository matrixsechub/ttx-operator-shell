import type { ActionClass, ApprovalReceipt } from "./types";
import type { ReceiptAuthorityEnv } from "./receiptAuthorityClient";
import type { SigningKeyEnv } from "./signingKeys";
import { governanceSigningKeysConfigured } from "./signingKeys";
import { resolveBeaconRuntimeState } from "./beaconRuntime";
import { createReceiptAuthorityClient } from "./receiptAuthorityClient";
import type { ProposalStoreEnv } from "./proposalStore";
import { requiresFailClosedAudit } from "./types";

export interface GovernanceHealth {
  status: "healthy" | "degraded" | "blocked";
  beaconVerified: boolean;
  beaconStatus: "verified_v2" | "legacy_v1" | "invalid";
  codexValid: boolean;
  auditWritable: boolean;
  receiptAuthorityAvailable: boolean;
  proposalStoreAvailable: boolean;
  allowedActionClasses: ActionClass[];
  reasonCodes: string[];
}

export type GovernanceHealthEnv = ReceiptAuthorityEnv &
  SigningKeyEnv &
  ProposalStoreEnv & {
    CODEX_VALIDATION_OK?: string;
  };

const PROBE_KEY = "governance:health:probe";

async function probeProposalStore(env: ProposalStoreEnv): Promise<boolean> {
  try {
    const token = crypto.randomUUID();
    await env.TTX_STATE.put(`${PROBE_KEY}:${token}`, "1", { expirationTtl: 60 });
    const value = await env.TTX_STATE.get(`${PROBE_KEY}:${token}`);
    await env.TTX_STATE.delete(`${PROBE_KEY}:${token}`);
    return value === "1";
  } catch {
    return false;
  }
}

export async function evaluateGovernanceHealth(env: GovernanceHealthEnv): Promise<GovernanceHealth> {
  const reasonCodes: string[] = [];
  const [beaconState, receiptHealth, proposalStoreAvailable] = await Promise.all([
    resolveBeaconRuntimeState(env),
    createReceiptAuthorityClient(env).health(),
    probeProposalStore(env),
  ]);

  const keys = governanceSigningKeysConfigured(env);
  if (!keys.governanceReceipt) reasonCodes.push("GOVERNANCE_RECEIPT_SIGNING_KEY_MISSING");
  if (!keys.beacon) reasonCodes.push("BEACON_SIGNING_KEY_MISSING");

  const beaconVerified = beaconState.status === "verified_v2";
  if (!beaconVerified) {
    reasonCodes.push(beaconState.status === "legacy_v1" ? "SIGNED_BEACON_NOT_ACTIVE" : beaconState.reasonCode);
  }

  const codexValid = env.CODEX_VALIDATION_OK !== "false";
  if (!codexValid) reasonCodes.push("CODEX_VALIDATION_FAILED");

  const receiptAuthorityAvailable = receiptHealth.ok;
  if (!receiptAuthorityAvailable) reasonCodes.push("RECEIPT_AUTHORITY_UNAVAILABLE");

  if (!proposalStoreAvailable) reasonCodes.push("PROPOSAL_STORE_UNAVAILABLE");

  const auditWritable = proposalStoreAvailable;
  if (!auditWritable) reasonCodes.push("AUDIT_WRITE_UNAVAILABLE");

  let status: GovernanceHealth["status"] = "healthy";
  if (
    !beaconVerified ||
    !keys.governanceReceipt ||
    !keys.beacon ||
    !receiptAuthorityAvailable ||
    !proposalStoreAvailable
  ) {
    status = "blocked";
  } else if (!codexValid) {
    status = "degraded";
  }

  const allowedActionClasses: ActionClass[] =
    status === "healthy"
      ? ["C0", "C1", "C2", "C3", "C4", "C5", "C6"]
      : status === "degraded"
        ? ["C0", "C1"]
        : ["C0", "C1"];

  return {
    status,
    beaconVerified,
    beaconStatus: beaconState.status,
    codexValid,
    auditWritable,
    receiptAuthorityAvailable,
    proposalStoreAvailable,
    allowedActionClasses,
    reasonCodes,
  };
}

export function actionClassAllowed(health: GovernanceHealth, actionClass: ActionClass): boolean {
  return health.allowedActionClasses.includes(actionClass);
}

export function requiresGovernedHealthGate(actionClass: ActionClass): boolean {
  return requiresFailClosedAudit(actionClass);
}

export function validateApprovalReceiptShape(receipt: ApprovalReceipt): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!receipt.approvalId) errors.push("approvalId required");
  if (!receipt.proposalId) errors.push("proposalId required");
  if (!/^[a-f0-9]{64}$/.test(receipt.actionDigest)) errors.push("actionDigest invalid");
  if (!/^[a-f0-9]{64}$/.test(receipt.beaconHash)) errors.push("beaconHash invalid");
  if (!/^[a-f0-9]{64}$/.test(receipt.codexHash)) errors.push("codexHash invalid");
  if (!receipt.nonce) errors.push("nonce required");
  if (!receipt.signature || receipt.signature.length < 16) errors.push("signature invalid");
  if (!["development", "staging", "production"].includes(receipt.targetEnvironment)) {
    errors.push("targetEnvironment invalid");
  }
  if (!/^C[0-6]$/.test(receipt.actionClass)) errors.push("actionClass invalid");
  return { valid: errors.length === 0, errors };
}

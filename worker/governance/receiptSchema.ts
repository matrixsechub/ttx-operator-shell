import type { ApprovalReceipt } from "./types";

const ACTION_CLASSES = new Set(["C0", "C1", "C2", "C3", "C4", "C5", "C6"]);
const ENVIRONMENTS = new Set(["development", "staging", "production"]);
const HASH_PATTERN = /^[a-f0-9]{64}$/;

export const APPROVAL_RECEIPT_SCHEMA_VERSION = "1.0.0";

const REQUIRED_FIELDS = [
  "approvalId",
  "proposalId",
  "proposalRevision",
  "actionClass",
  "actionDigest",
  "beaconHash",
  "codexHash",
  "targetEnvironment",
  "approvedBy",
  "approvedAt",
  "expiresAt",
  "nonce",
  "signature",
] as const;

export function validateApprovalReceiptSchema(
  receipt: unknown,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
    return { valid: false, errors: ["receipt must be an object"] };
  }
  const value = receipt as Record<string, unknown>;
  const allowed = new Set<string>([...REQUIRED_FIELDS]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      errors.push(`unexpected field: ${key}`);
    }
  }
  for (const field of REQUIRED_FIELDS) {
    if (value[field] === undefined || value[field] === null || value[field] === "") {
      errors.push(`${field} is required`);
    }
  }
  if (typeof value.proposalRevision !== "number" || value.proposalRevision < 1) {
    errors.push("proposalRevision must be a positive number");
  }
  if (typeof value.actionClass === "string" && !ACTION_CLASSES.has(value.actionClass)) {
    errors.push("actionClass invalid");
  }
  if (typeof value.targetEnvironment === "string" && !ENVIRONMENTS.has(value.targetEnvironment)) {
    errors.push("targetEnvironment invalid");
  }
  for (const hashField of ["actionDigest", "beaconHash", "codexHash"] as const) {
    if (typeof value[hashField] === "string" && !HASH_PATTERN.test(value[hashField])) {
      errors.push(`${hashField} must be sha256 hex`);
    }
  }
  if (typeof value.signature === "string" && value.signature.length < 16) {
    errors.push("signature too short");
  }
  if (value.approval_id || value.proposal_id || value.approved_action_exact_hash) {
    errors.push("obsolete receipt shape detected");
  }
  return { valid: errors.length === 0, errors };
}

export function assertApprovalReceiptSchema(receipt: ApprovalReceipt): void {
  const result = validateApprovalReceiptSchema(receipt);
  if (!result.valid) {
    throw new Error(`approval receipt schema invalid: ${result.errors.join(", ")}`);
  }
}

import type { ActionProposal } from "./types";
import { ACTION_CLASS_REQUIRES_APPROVAL } from "./types";
import type { BeaconRuntimeState } from "./beaconRuntime";

export interface GovernanceDenialState {
  authenticated: boolean;
  requestValid: boolean;
  receiptPresent: boolean;
  receiptValid: boolean;
  receiptExpired: boolean;
  receiptBindingValid: boolean;
  beaconAvailable: boolean;
  beaconSignatureValid: boolean;
  beaconHashValid: boolean;
  beaconSafeMode: boolean;
  policyAllowed: boolean;
}

export interface GovernanceDenialResult {
  httpStatus: number;
  code: string;
  reason: string;
  emitEvidence: boolean;
  mutationOccurred: false;
  deploymentTriggered: false;
  receiptConsumed: false;
}

export const GOVERNANCE_DENIAL_GUARANTEES = {
  mutationOccurred: false as const,
  deploymentTriggered: false as const,
  receiptConsumed: false as const,
};

function denial(httpStatus: number, code: string, reason: string, emitEvidence = true): GovernanceDenialResult {
  return {
    httpStatus,
    code,
    reason,
    emitEvidence,
    ...GOVERNANCE_DENIAL_GUARANTEES,
  };
}

/**
 * Precedence (highest first):
 * 1. Structural proposal defects (incomplete, expired, unknown class)
 * 2. Beacon hash mismatch — client bound to stale/wrong hash; must not be masked by safe mode
 * 3. Codex hash mismatch — same integrity rationale
 * 4. Signed beacon v2 not active (legacy v1 reference, hash matched)
 * 5. Beacon safe mode / unverified runtime
 */
export function resolveProposalPolicyDenial(
  beaconState: BeaconRuntimeState,
  proposal: Pick<
    ActionProposal,
    "action_class" | "beacon_hash" | "codex_hash" | "summary" | "rollback_plan" | "expiration"
  >,
  codexManifestHash: string,
): GovernanceDenialResult | null {
  if (!proposal.summary.trim() || !proposal.rollback_plan.trim()) {
    return denial(403, "INCOMPLETE_PROPOSAL", "Summary and rollback plan are required");
  }

  if (Date.parse(proposal.expiration) <= Date.now()) {
    return denial(403, "PROPOSAL_EXPIRED", "Proposal already expired");
  }

  if (ACTION_CLASS_REQUIRES_APPROVAL[proposal.action_class] === undefined) {
    return denial(403, "INVALID_ACTION_CLASS", "Unknown action class");
  }

  if (beaconState.hash && proposal.beacon_hash !== beaconState.hash) {
    return denial(
      403,
      "BEACON_HASH_MISMATCH",
      "Beacon hash mismatch — proposal must be revalidated",
    );
  }

  if (proposal.codex_hash !== codexManifestHash) {
    return denial(
      403,
      "CODEX_HASH_MISMATCH",
      "Codex manifest hash mismatch — proposal must be revalidated",
    );
  }

  if (beaconState.status === "legacy_v1") {
    return denial(
      403,
      "SIGNED_BEACON_NOT_ACTIVE",
      "Beacon safe mode — proposals blocked",
    );
  }

  if (beaconState.status !== "verified_v2" || !beaconState.hash) {
    const code = beaconState.status === "invalid" ? "BEACON_UNVERIFIED" : "BEACON_SAFE_MODE";
    return denial(403, code, "Beacon safe mode — proposals blocked");
  }

  return null;
}

export function resolveGovernanceDenialFromState(state: GovernanceDenialState): GovernanceDenialResult | null {
  if (!state.authenticated) {
    return denial(401, "UNAUTHENTICATED", "Operator authentication required", false);
  }
  if (!state.requestValid) {
    return denial(400, "INVALID_REQUEST", "Request validation failed");
  }
  if (!state.receiptPresent) {
    return denial(403, "RECEIPT_NOT_FOUND", "Approval receipt not found");
  }
  if (!state.receiptValid) {
    return denial(403, "RECEIPT_SIGNATURE_INVALID", "Invalid receipt signature");
  }
  if (state.receiptExpired) {
    return denial(403, "RECEIPT_EXPIRED", "Approval receipt expired");
  }
  if (!state.receiptBindingValid) {
    return denial(403, "RECEIPT_BINDING_INVALID", "Receipt binding invalid");
  }
  if (state.beaconAvailable && !state.beaconHashValid) {
    return denial(403, "BEACON_HASH_MISMATCH", "Beacon hash mismatch");
  }
  if (state.beaconAvailable && !state.beaconSignatureValid) {
    return denial(403, "BEACON_SIGNATURE_INVALID", "Beacon signature invalid");
  }
  if (state.beaconSafeMode) {
    return denial(403, "BEACON_SAFE_MODE", "Beacon safe mode active");
  }
  if (!state.policyAllowed) {
    return denial(403, "POLICY_DENIED", "Policy denied action");
  }
  return null;
}

export const PROPOSAL_POLICY_DENIAL_TABLE = [
  { condition: "incomplete proposal", httpStatus: 403, code: "INCOMPLETE_PROPOSAL", precedence: 1, emitEvidence: true },
  { condition: "expired proposal", httpStatus: 403, code: "PROPOSAL_EXPIRED", precedence: 2, emitEvidence: true },
  { condition: "unknown action class", httpStatus: 403, code: "INVALID_ACTION_CLASS", precedence: 3, emitEvidence: true },
  { condition: "beacon hash mismatch", httpStatus: 403, code: "BEACON_HASH_MISMATCH", precedence: 4, emitEvidence: true },
  { condition: "codex hash mismatch", httpStatus: 403, code: "CODEX_HASH_MISMATCH", precedence: 5, emitEvidence: true },
  { condition: "legacy v1 active (hash matched)", httpStatus: 403, code: "SIGNED_BEACON_NOT_ACTIVE", precedence: 6, emitEvidence: true },
  { condition: "beacon unverified", httpStatus: 403, code: "BEACON_UNVERIFIED", precedence: 7, emitEvidence: true },
  { condition: "beacon safe mode", httpStatus: 403, code: "BEACON_SAFE_MODE", precedence: 8, emitEvidence: true },
] as const;

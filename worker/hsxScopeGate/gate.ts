import type { BeaconReleaseEnv } from "../beacon/beaconRelease";
import { digestInputFromProposal } from "../governance/actionDigest";
import { verifyApprovalForExecution, resolveExecutionSigning } from "../governance/approvalVerifier";
import { resolveBeaconRuntimeState } from "../governance/beaconRuntime";
import { getProposal, type ProposalStoreEnv } from "../governance/proposalStore";
import type { ReceiptAuthorityEnv } from "../governance/receiptAuthorityClient";
import { resolveRuntimeEnvironment } from "../governance/runtimeEnv";
import type { SigningKeyEnv } from "../governance/signingKeys";
import { assessHsxActionRisk, requiredEvidenceTypes } from "./risk";
import { validateHsxScopeGatePacket } from "./schema";
import { getScopeGateDecisionForPacket, persistScopeGateDecision } from "./store";
import type { HsxRiskAssessment, HsxScopeGateCheck, HsxScopeGateDecision, HsxScopeGatePacket } from "./types";

export type HsxScopeGateEnv = ProposalStoreEnv & BeaconReleaseEnv & SigningKeyEnv & ReceiptAuthorityEnv;
const PACKET_MAX_AGE_MS = 5 * 60 * 1000;
const DECISION_TTL_MS = 60 * 1000;
const EMPTY_RISK: HsxRiskAssessment = { score: 0, tier: "low", factors: [], evidence_required: false };

function matchesScopePattern(pattern: string, value: string): boolean {
  if (pattern === "*") return true;
  if (pattern.endsWith("/*")) return value.startsWith(pattern.slice(0, -1));
  return pattern === value;
}

function decision(
  packet: Pick<HsxScopeGatePacket, "packet_id" | "correlation_id">,
  outcome: "approved" | "denied",
  reasonCode: string,
  risk: HsxRiskAssessment,
  checks: HsxScopeGateCheck[],
  beaconHash: string | null,
  approvalVerified: boolean,
): HsxScopeGateDecision {
  const now = Date.now();
  return {
    version: "hsx.scope-gate.decision.v1",
    decision_id: crypto.randomUUID(),
    packet_id: packet.packet_id,
    correlation_id: packet.correlation_id,
    decided_at: new Date(now).toISOString(),
    outcome,
    reason_code: reasonCode,
    risk,
    checks,
    beacon_hash: beaconHash,
    approval_verified: approvalVerified,
    expires_at: new Date(now + DECISION_TTL_MS).toISOString(),
  };
}

async function deny(
  env: HsxScopeGateEnv,
  packet: HsxScopeGatePacket | null,
  identity: Pick<HsxScopeGatePacket, "packet_id" | "correlation_id">,
  code: string,
  risk: HsxRiskAssessment,
  checks: HsxScopeGateCheck[],
  beaconHash: string | null,
): Promise<HsxScopeGateDecision> {
  const result = decision(identity, "denied", code, risk, checks, beaconHash, false);
  try {
    await persistScopeGateDecision(env, packet, result);
    return result;
  } catch {
    return decision(identity, "denied", "TRACKING_WRITE_FAILED", risk, checks, beaconHash, false);
  }
}

export async function evaluateHsxScopeGate(env: HsxScopeGateEnv, input: unknown): Promise<HsxScopeGateDecision> {
  const validation = validateHsxScopeGatePacket(input);
  if (!validation.valid) {
    const checks: HsxScopeGateCheck[] = [{ name: "schema", passed: false, code: "SCHEMA_INVALID" }];
    return deny(
      env,
      null,
      { packet_id: validation.packetId, correlation_id: validation.correlationId },
      "SCHEMA_INVALID",
      EMPTY_RISK,
      checks,
      null,
    );
  }

  const packet = validation.packet;
  const checks: HsxScopeGateCheck[] = [{ name: "schema", passed: true, code: "SCHEMA_VALID" }];
  const risk = assessHsxActionRisk(packet);

  try {
    const replay = await getScopeGateDecisionForPacket(env, packet.packet_id);
    if (replay) {
      checks.push({ name: "freshness", passed: false, code: "PACKET_REPLAYED" });
      return deny(env, packet, packet, "PACKET_REPLAYED", risk, checks, replay.beacon_hash);
    }
  } catch {
    checks.push({ name: "freshness", passed: false, code: "TRACKING_READ_FAILED" });
    return decision(packet, "denied", "TRACKING_READ_FAILED", risk, checks, null, false);
  }

  const issuedAt = Date.parse(packet.issued_at);
  if (issuedAt > Date.now() + 30_000 || Date.now() - issuedAt > PACKET_MAX_AGE_MS) {
    checks.push({ name: "freshness", passed: false, code: "PACKET_STALE" });
    return deny(env, packet, packet, "PACKET_STALE", risk, checks, null);
  }
  if (Date.parse(packet.engagement.expires_at) <= Date.now()) {
    checks.push({ name: "scope", passed: false, code: "ENGAGEMENT_EXPIRED" });
    return deny(env, packet, packet, "ENGAGEMENT_EXPIRED", risk, checks, null);
  }
  checks.push({ name: "freshness", passed: true, code: "PACKET_FRESH" });

  if (packet.target.environment !== resolveRuntimeEnvironment(env)) {
    checks.push({ name: "scope", passed: false, code: "ENVIRONMENT_MISMATCH" });
    return deny(env, packet, packet, "ENVIRONMENT_MISMATCH", risk, checks, null);
  }

  const beacon = await resolveBeaconRuntimeState(env);
  if (beacon.status !== "verified_v2") {
    checks.push({ name: "beacon", passed: false, code: beacon.reasonCode });
    return deny(env, packet, packet, beacon.reasonCode, risk, checks, beacon.hash);
  }
  checks.push({ name: "beacon", passed: true, code: "BEACON_V2_VERIFIED" });

  const target = `${packet.target.system}:${packet.target.resource}`;
  const targetAllowed = packet.engagement.authorized_targets.some(
    (pattern) => matchesScopePattern(pattern, target) || matchesScopePattern(pattern, packet.target.system),
  );
  checks.push({ name: "target", passed: targetAllowed, code: targetAllowed ? "TARGET_AUTHORIZED" : "TARGET_UNAUTHORIZED" });
  if (!targetAllowed) return deny(env, packet, packet, "TARGET_UNAUTHORIZED", risk, checks, beacon.hash);

  const actionAllowed = packet.engagement.allowed_actions.some(
    (pattern) => matchesScopePattern(pattern, packet.action.type) || matchesScopePattern(pattern, packet.action.operation),
  );
  checks.push({ name: "action", passed: actionAllowed, code: actionAllowed ? "ACTION_ALLOWED" : "ACTION_NOT_ALLOWED" });
  if (!actionAllowed) return deny(env, packet, packet, "ACTION_NOT_ALLOWED", risk, checks, beacon.hash);

  const missingPermissions = packet.action.permissions.filter(
    (permission) => !packet.engagement.allowed_permissions.some((pattern) => matchesScopePattern(pattern, permission)),
  );
  const permissionsAllowed = missingPermissions.length === 0;
  checks.push({
    name: "permissions",
    passed: permissionsAllowed,
    code: permissionsAllowed ? "PERMISSIONS_ALLOWED" : "PERMISSION_DENIED",
  });
  if (!permissionsAllowed) return deny(env, packet, packet, "PERMISSION_DENIED", risk, checks, beacon.hash);
  checks.push({ name: "scope", passed: true, code: "ENGAGEMENT_SCOPE_ACTIVE" });

  const requiredEvidence = requiredEvidenceTypes(packet, risk);
  const evidenceComplete = requiredEvidence.every((type) =>
    packet.evidence.some(
      (entry) =>
        entry.type === type &&
        typeof entry.sha256 === "string" &&
        Date.parse(entry.observed_at) <= Date.now() + 30_000 &&
        Date.now() - Date.parse(entry.observed_at) <= 24 * 60 * 60 * 1000,
    ),
  );
  checks.push({ name: "evidence", passed: evidenceComplete, code: evidenceComplete ? "EVIDENCE_COMPLETE" : "EVIDENCE_REQUIRED" });
  if (!evidenceComplete) return deny(env, packet, packet, "EVIDENCE_REQUIRED", risk, checks, beacon.hash);

  let approvalVerified = false;
  if (Number(packet.action.class.slice(1)) >= 2) {
    if (!packet.approval) {
      checks.push({ name: "approval", passed: false, code: "APPROVAL_RECEIPT_REQUIRED" });
      return deny(env, packet, packet, "APPROVAL_RECEIPT_REQUIRED", risk, checks, beacon.hash);
    }
    const signing = resolveExecutionSigning(env);
    if (!signing) {
      checks.push({ name: "approval", passed: false, code: "GOVERNANCE_SIGNING_KEY_MISSING" });
      return deny(env, packet, packet, "GOVERNANCE_SIGNING_KEY_MISSING", risk, checks, beacon.hash);
    }
    const proposal = await getProposal(env, packet.approval.proposal_id);
    if (!proposal || proposal.target_system !== packet.target.system || proposal.action_class !== packet.action.class) {
      checks.push({ name: "approval", passed: false, code: "PROPOSAL_SCOPE_MISMATCH" });
      return deny(env, packet, packet, "PROPOSAL_SCOPE_MISMATCH", risk, checks, beacon.hash);
    }
    const verification = await verifyApprovalForExecution(env, {
      proposalId: packet.approval.proposal_id,
      approvalId: packet.approval.approval_id,
      actionDigestInput: digestInputFromProposal(
        proposal,
        packet.action.type,
        packet.target.environment,
        packet.action.payload,
      ),
      environment: packet.target.environment,
      signing,
    });
    approvalVerified = verification.valid;
    checks.push({ name: "approval", passed: verification.valid, code: verification.valid ? "APPROVAL_VERIFIED" : verification.code ?? "APPROVAL_INVALID" });
    if (!verification.valid) return deny(env, packet, packet, verification.code ?? "APPROVAL_INVALID", risk, checks, beacon.hash);
  } else {
    checks.push({ name: "approval", passed: true, code: "APPROVAL_NOT_REQUIRED" });
  }

  const approved = decision(packet, "approved", "SCOPE_GATE_APPROVED", risk, checks, beacon.hash, approvalVerified);
  try {
    await persistScopeGateDecision(env, packet, approved);
    return approved;
  } catch {
    return decision(packet, "denied", "TRACKING_WRITE_FAILED", risk, checks, beacon.hash, false);
  }
}

export async function executeWithHsxScopeGate<TResult>(
  env: HsxScopeGateEnv,
  input: unknown,
  execute: (packet: HsxScopeGatePacket, decision: HsxScopeGateDecision) => Promise<TResult>,
): Promise<{ ok: true; decision: HsxScopeGateDecision; result: TResult } | { ok: false; decision: HsxScopeGateDecision }> {
  const gateDecision = await evaluateHsxScopeGate(env, input);
  if (gateDecision.outcome !== "approved") return { ok: false, decision: gateDecision };
  const validation = validateHsxScopeGatePacket(input);
  if (!validation.valid) {
    return {
      ok: false,
      decision: decision(
        { packet_id: gateDecision.packet_id, correlation_id: gateDecision.correlation_id },
        "denied",
        "SCHEMA_INVALID_AFTER_GATE",
        gateDecision.risk,
        gateDecision.checks,
        gateDecision.beacon_hash,
        false,
      ),
    };
  }
  const result = await execute(validation.packet, gateDecision);
  return { ok: true, decision: gateDecision, result };
}

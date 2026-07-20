/**
 * Flywheel main-compat shims.
 * Proposal/receipt/codex helpers remain local; Beacon runtime classification
 * delegates to the shared signed Beacon v2 verifier (fail-closed).
 */
import type { BeaconReleaseEnv, BeaconRuntimeState } from "../governance/beaconRuntime";
import {
  getBeaconHashForReads as resolveBeaconHashForReads,
  resolveBeaconRuntimeState as resolveSharedBeaconRuntimeState,
} from "../governance/beaconRuntime";

export type { BeaconReleaseEnv, BeaconRuntimeState };
export type ActionClass = "C0" | "C1" | "C2" | "C3" | "C4" | "C5" | "C6";
export type ProposalStatus = "draft" | "pending" | "approved" | "denied" | "executed" | "expired" | "rolled_back";
export type RuntimeEnvironment = "development" | "staging" | "production";

export interface NorthstarImpact {
  stability: string;
  revenue_validation: string;
  trust: string;
  controlled_growth: string;
  wildcard_innovation: string;
}

export interface RiskScore {
  numeric: number;
  qualitative: "low" | "medium" | "high" | "critical";
}

export interface ActionProposal {
  proposal_id: string;
  revision: number;
  created_by: string;
  created_at: string;
  target_system: string;
  action_class: ActionClass;
  summary: string;
  intended_outcome: string;
  northstar_impact: NorthstarImpact;
  evidence_refs: string[];
  risk_score: RiskScore;
  rollback_plan: string;
  affected_data: string[];
  affected_users: "internal" | "customer" | "system" | "mixed";
  required_approver: "operator";
  beacon_hash: string;
  codex_hash: string;
  expiration: string;
  status: ProposalStatus;
  action_payload?: Record<string, unknown>;
  approval_id?: string;
  denial_reason?: string;
}

export interface ApprovalReceipt {
  approvalId: string;
  proposalId: string;
  proposalRevision: number;
  actionClass: ActionClass;
  actionDigest: string;
  beaconHash: string;
  codexHash: string;
  targetEnvironment: RuntimeEnvironment;
  approvedBy: string;
  approvedAt: string;
  expiresAt: string;
  nonce: string;
  signature: string;
}

export interface ExecutionReceipt {
  executionId: string;
  proposalId: string;
  approvalId: string;
  actionDigest: string;
  beaconHash: string;
  codexHash: string;
  environment: RuntimeEnvironment;
  idempotencyKey: string;
  status: "succeeded" | "failed";
  startedAt: string;
  completedAt: string;
  rollbackReference: string;
  auditBundleId: string;
}

export interface CodexManifestSnapshot {
  manifestHash: string;
  manifestVersion: string;
  lastValidatedAt: string | null;
  driftCount: number;
}

export interface ResolvedSigningKey {
  key: string;
  domain: string;
  keyId: string;
}

export interface GovernedMutationInput<TInput> {
  actionType: string;
  actionClass: ActionClass;
  environment: RuntimeEnvironment;
  proposalId: string;
  approvalId: string;
  actionDigest: string;
  idempotencyKey: string;
  input: TInput;
  rollbackReference: string;
  execute: () => Promise<unknown>;
}

export interface GovernedMutationResult<TResult> {
  ok: boolean;
  result?: TResult;
  executionReceipt?: ExecutionReceipt;
  error?: string;
  code?: string;
}

export type ProposalStoreEnv = { TTX_STATE: KVNamespace };
export type SigningKeyEnv = {
  GOVERNANCE_RECEIPT_SIGNING_KEY?: string;
  AUTH_SIGNING_KEY?: string;
};
export type RuntimeEnvSource = { DEPLOY_ENV?: string };

const PROPOSAL_PREFIX = "flywheel:compat:proposal:";
const RECEIPT_PREFIX = "flywheel:compat:receipt:";
const GOVERNANCE_RECEIPT_DOMAIN = "mshops.governance.receipt.v1";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 30;

export function defaultNorthstarImpact(
  axis: "STABILITY" | "REVENUE_VALIDATION" | "TRUST" | "CONTROLLED_GROWTH" | "WILDCARD_INNOVATION" = "STABILITY",
): NorthstarImpact {
  return {
    stability: axis === "STABILITY" ? "primary" : "neutral",
    revenue_validation: axis === "REVENUE_VALIDATION" ? "primary" : "neutral",
    trust: axis === "TRUST" ? "primary" : "neutral",
    controlled_growth: axis === "CONTROLLED_GROWTH" ? "primary" : "neutral",
    wildcard_innovation: axis === "WILDCARD_INNOVATION" ? "primary" : "neutral",
  };
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSign(payload: string, key: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(payload));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function resolveBeaconRuntimeState(env: BeaconReleaseEnv): Promise<BeaconRuntimeState> {
  return resolveSharedBeaconRuntimeState(env);
}

export async function getBeaconHashForReads(env: BeaconReleaseEnv): Promise<string> {
  return resolveBeaconHashForReads(env);
}

export async function getCodexManifestSnapshot(): Promise<CodexManifestSnapshot> {
  const manifestHash = await sha256Hex("flywheel-engine-v1-main-compat");
  return {
    manifestHash,
    manifestVersion: "1.0.0-main-compat",
    lastValidatedAt: null,
    driftCount: 0,
  };
}

export function resolveRuntimeEnvironment(env: RuntimeEnvSource): RuntimeEnvironment {
  if (env.DEPLOY_ENV === "production") return "production";
  if (env.DEPLOY_ENV === "staging") return "staging";
  return "development";
}

export function resolveExecutionSigning(env: SigningKeyEnv): ResolvedSigningKey | null {
  const key = env.GOVERNANCE_RECEIPT_SIGNING_KEY?.trim() || env.AUTH_SIGNING_KEY?.trim();
  if (!key) return null;
  return { key, domain: GOVERNANCE_RECEIPT_DOMAIN, keyId: "flywheel-main-compat" };
}

export async function saveProposal(env: ProposalStoreEnv, proposal: ActionProposal): Promise<ActionProposal> {
  await env.TTX_STATE.put(`${PROPOSAL_PREFIX}${proposal.proposal_id}`, JSON.stringify(proposal), {
    expirationTtl: DEFAULT_TTL_SECONDS,
  });
  return proposal;
}

export async function getProposal(env: ProposalStoreEnv, proposalId: string): Promise<ActionProposal | null> {
  const raw = await env.TTX_STATE.get(`${PROPOSAL_PREFIX}${proposalId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActionProposal;
  } catch {
    return null;
  }
}

export async function updateProposalStatus(
  env: ProposalStoreEnv,
  proposalId: string,
  status: ProposalStatus,
  patch: Partial<ActionProposal> = {},
): Promise<ActionProposal | null> {
  const existing = await getProposal(env, proposalId);
  if (!existing) return null;
  const next = { ...existing, ...patch, status };
  await saveProposal(env, next);
  return next;
}

export async function saveApprovalReceipt(env: ProposalStoreEnv, receipt: ApprovalReceipt): Promise<ApprovalReceipt> {
  await env.TTX_STATE.put(`${RECEIPT_PREFIX}${receipt.approvalId}`, JSON.stringify(receipt), {
    expirationTtl: DEFAULT_TTL_SECONDS,
  });
  return receipt;
}

export async function computeProposalActionDigest(
  proposal: ActionProposal,
  environment: RuntimeEnvironment,
  options?: { actionType?: string; mutationPayload?: Record<string, unknown> },
): Promise<string> {
  const actionType = options?.actionType ?? "flywheel.command";
  const mutationPayload = options?.mutationPayload ?? proposal.action_payload ?? {};
  return sha256Hex(JSON.stringify({
    actionType,
    actionClass: proposal.action_class,
    targetEnvironment: environment,
    targetResource: proposal.target_system,
    mutationPayload,
    rollbackReference: proposal.rollback_plan,
    proposalRevision: proposal.revision,
    proposalId: proposal.proposal_id,
  }));
}

export function buildReceiptFromProposal(
  proposal: ActionProposal,
  fields: {
    approvalId: string;
    actionDigest: string;
    approvedBy: string;
    approvedAt: string;
    expiresAt: string;
    nonce: string;
    targetEnvironment: RuntimeEnvironment;
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
  const payload = JSON.stringify({ domain: signing.domain, keyId: signing.keyId, ...unsigned });
  const signature = await hmacSign(payload, signing.key);
  return { ...unsigned, signature };
}

export async function runGovernedMutation<TInput, TResult>(
  env: SigningKeyEnv & BeaconReleaseEnv,
  mutation: GovernedMutationInput<TInput>,
): Promise<GovernedMutationResult<TResult>> {
  const signing = resolveExecutionSigning(env);
  if (!signing) {
    return { ok: false, code: "GOVERNANCE_SIGNING_KEY_MISSING", error: "Governance receipt signing key not configured" };
  }
  const beacon = await resolveBeaconRuntimeState(env);
  if (!beacon.hash) {
    return { ok: false, code: "GOVERNANCE_MISSING_BEACON", error: "Beacon hash is unavailable." };
  }
  const startedAt = new Date().toISOString();
  try {
    const result = await mutation.execute() as TResult;
    const codex = await getCodexManifestSnapshot();
    const completedAt = new Date().toISOString();
    return {
      ok: true,
      result,
      executionReceipt: {
        executionId: crypto.randomUUID(),
        proposalId: mutation.proposalId,
        approvalId: mutation.approvalId,
        actionDigest: mutation.actionDigest,
        beaconHash: beacon.hash,
        codexHash: codex.manifestHash,
        environment: mutation.environment,
        idempotencyKey: mutation.idempotencyKey,
        status: "succeeded",
        startedAt,
        completedAt,
        rollbackReference: mutation.rollbackReference,
        auditBundleId: crypto.randomUUID(),
      },
    };
  } catch (error) {
    return {
      ok: false,
      code: error instanceof Error ? error.message : "GOVERNANCE_EXECUTION_FAILED",
      error: error instanceof Error ? error.message : "Governed Flywheel execution failed.",
    };
  }
}

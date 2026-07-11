import { ensureAgentGovernance } from "../msh-ops/agent/initAgentGovernance";
import { getCodexManifestSnapshot } from "./codex/manifestHash";
import { getActivationQueueSummary } from "./activation/activationQueue";
import { countGovernanceProposals } from "./governance/proposalStore";
import { countAuditIncompleteExecutions } from "./governance/executionStore";
import { listGovernanceDeltaReports } from "./governance/mcp/deltaStore";
import type { BeaconReleaseEnv } from "./beacon/beaconRelease";
import { resolveBeaconRuntimeState } from "./governance/beaconRuntime";
import { evaluateGovernanceHealth, type GovernanceHealthEnv } from "./governance/governanceHealth";
import type { TelemetryEnv } from "./telemetry";

const REGISTER_INDEX_KEY = "mshops:funnel:v1:register:index";

export interface OperatorBeaconStatus {
  id: string;
  version: number;
  hash: string;
  safeMode: boolean;
  runtimeStatus: "verified_v2" | "legacy_v1" | "invalid";
  v2?: {
    verified: boolean;
    version: string | null;
    beaconHash: string | null;
    publishedAt: string | null;
    reason: string;
  };
}

export interface OperatorCodexStatus {
  manifestHash: string;
  manifestVersion: string;
  lastValidatedAt: string | null;
  driftCount: number;
}

export interface OperatorQueueStatus {
  activation: {
    date: string;
    pending: number;
    total: number;
    maxPerDay: number;
  };
  registration: {
    length: number;
  };
}

export interface OperatorApprovalStatus {
  pending: number;
  expired: number;
}

export interface OperatorGovernanceHealth {
  status: "healthy" | "degraded" | "blocked";
  beaconVerified: boolean;
  beaconStatus: "verified_v2" | "legacy_v1" | "invalid";
  codexValid: boolean;
  receiptAuthorityAvailable: boolean;
  proposalStoreAvailable: boolean;
  allowedActionClasses: string[];
  reasonCodes: string[];
  pendingApprovals: number;
  expiredApprovals: number;
  auditIncompleteExecutions: number;
  mcpDeltasAwaitingReview: number;
  legacyBypassBlocked: boolean;
}

export interface OperatorOsStatusSnapshot {
  beacon: OperatorBeaconStatus;
  codex: OperatorCodexStatus;
  queues: OperatorQueueStatus;
  approvals: OperatorApprovalStatus;
  governance: OperatorGovernanceHealth;
}

export type OperatorStatusEnv = TelemetryEnv & BeaconReleaseEnv & GovernanceHealthEnv;

async function getRegisterQueueLength(kv: KVNamespace): Promise<number> {
  const raw = await kv.get(REGISTER_INDEX_KEY);
  if (!raw) return 0;
  try {
    const ids = JSON.parse(raw) as unknown;
    return Array.isArray(ids) ? ids.length : 0;
  } catch {
    return 0;
  }
}

export async function buildOperatorOsStatusSnapshot(env: OperatorStatusEnv): Promise<OperatorOsStatusSnapshot> {
  const governanceCtx = await ensureAgentGovernance();
  const [codex, activation, registration, approvalCounts, beaconState, health, auditIncomplete, mcpDeltas] =
    await Promise.all([
      getCodexManifestSnapshot(),
      getActivationQueueSummary(env),
      getRegisterQueueLength(env.TTX_STATE),
      countGovernanceProposals(env),
      resolveBeaconRuntimeState(env),
      evaluateGovernanceHealth(env),
      countAuditIncompleteExecutions(env),
      listGovernanceDeltaReports(env),
    ]);

  const quarantined = mcpDeltas.filter((report) => report.quarantined);

  return {
    beacon: {
      id: governanceCtx.beacon.id,
      version: beaconState.status === "verified_v2" ? 2 : 1,
      hash: beaconState.hash ?? "",
      safeMode: governanceCtx.safeMode || beaconState.status !== "verified_v2",
      runtimeStatus: beaconState.status,
      v2: {
        verified: beaconState.status === "verified_v2",
        version: beaconState.status === "verified_v2" ? beaconState.version : null,
        beaconHash: beaconState.hash,
        publishedAt: null,
        reason: beaconState.status === "verified_v2" ? "verified" : beaconState.status === "legacy_v1" ? "SIGNED_BEACON_NOT_ACTIVE" : beaconState.reasonCode,
      },
    },
    codex: {
      manifestHash: codex.manifestHash,
      manifestVersion: codex.manifestVersion ?? "1.0.0",
      lastValidatedAt: codex.lastValidatedAt,
      driftCount: codex.driftCount,
    },
    queues: {
      activation,
      registration: { length: registration },
    },
    approvals: approvalCounts,
    governance: {
      status: health.status,
      beaconVerified: health.beaconVerified,
      beaconStatus: health.beaconStatus,
      codexValid: health.codexValid,
      receiptAuthorityAvailable: health.receiptAuthorityAvailable,
      proposalStoreAvailable: health.proposalStoreAvailable,
      allowedActionClasses: health.allowedActionClasses,
      reasonCodes: health.reasonCodes,
      pendingApprovals: approvalCounts.pending,
      expiredApprovals: approvalCounts.expired,
      auditIncompleteExecutions: auditIncomplete,
      mcpDeltasAwaitingReview: quarantined.length,
      legacyBypassBlocked: true,
    },
  };
}

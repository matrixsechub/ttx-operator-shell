import { ensureBeaconLoaded } from "../msh-ops/beacon/loadBeacon";
import { getCodexManifestSnapshot } from "./codex/manifestHash";
import { countGovernanceProposals } from "./governance/proposalStore";
import type { BeaconReleaseEnv } from "./beacon/beaconRelease";
import { getVerifiedBeaconV2State } from "./beacon/beaconRelease";
import { resolveBeaconRuntimeState } from "./governance/beaconRuntime";
import { evaluateGovernanceHealth, type GovernanceHealthEnv } from "./governance/governanceHealth";
import type { TelemetryEnv } from "./telemetry";

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

export async function buildOperatorOsStatusSnapshot(env: OperatorStatusEnv): Promise<OperatorOsStatusSnapshot> {
  const [beaconLoaded, codex, beaconRuntime, governanceHealth, proposalCounts] = await Promise.all([
    ensureBeaconLoaded(),
    getCodexManifestSnapshot(),
    resolveBeaconRuntimeState(env),
    evaluateGovernanceHealth(env),
    countGovernanceProposals(env),
  ]);

  const v2State = await getVerifiedBeaconV2State(env);

  return {
    beacon: {
      id: beaconLoaded.beacon.id,
      version: 1,
      hash: beaconLoaded.integrityHash,
      safeMode: beaconLoaded.safeMode,
      runtimeStatus: beaconRuntime.status,
      v2: {
        verified: v2State.verified,
        version: v2State.version,
        beaconHash: v2State.beaconHash,
        publishedAt: v2State.publishedAt,
        reason: v2State.reason,
      },
    },
    codex: {
      manifestHash: codex.manifestHash,
      manifestVersion: codex.manifestVersion,
      lastValidatedAt: codex.lastValidatedAt,
      driftCount: codex.driftCount,
    },
    queues: {
      activation: { date: new Date().toISOString().slice(0, 10), pending: 0, total: 0, maxPerDay: 0 },
      registration: { length: 0 },
    },
    approvals: {
      pending: proposalCounts.pending,
      expired: proposalCounts.expired,
    },
    governance: governanceHealth,
  };
}

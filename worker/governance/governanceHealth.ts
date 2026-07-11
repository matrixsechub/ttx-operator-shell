import { getCodexManifestSnapshot } from "../codex/manifestHash";
import type { ProposalStoreEnv } from "./proposalStore";
import { countGovernanceProposals } from "./proposalStore";
import type { BeaconReleaseEnv } from "../beacon/beaconRelease";
import { resolveBeaconRuntimeState } from "./beaconRuntime";
import { ACTION_CLASS_REQUIRES_APPROVAL } from "./types";

export type GovernanceHealthEnv = ProposalStoreEnv & BeaconReleaseEnv;

export interface GovernanceHealthSnapshot {
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

export async function evaluateGovernanceHealth(env: GovernanceHealthEnv): Promise<GovernanceHealthSnapshot> {
  const [beaconState, codex, counts] = await Promise.all([
    resolveBeaconRuntimeState(env),
    getCodexManifestSnapshot(),
    countGovernanceProposals(env),
  ]);

  const reasonCodes: string[] = [];
  const beaconVerified = beaconState.status === "verified_v2";
  if (!beaconVerified) reasonCodes.push(beaconState.status === "legacy_v1" ? "SIGNED_BEACON_NOT_ACTIVE" : "BEACON_UNVERIFIED");

  const codexValid = Boolean(codex.manifestHash);
  if (!codexValid) reasonCodes.push("CODEX_MANIFEST_UNAVAILABLE");

  const proposalStoreAvailable = Boolean(env.TTX_STATE);
  if (!proposalStoreAvailable) reasonCodes.push("PROPOSAL_STORE_UNAVAILABLE");

  const blocked = !beaconVerified || !codexValid || !proposalStoreAvailable;
  const degraded = counts.pending > 10 || counts.expired > 0;

  return {
    status: blocked ? "blocked" : degraded ? "degraded" : "healthy",
    beaconVerified,
    beaconStatus: beaconState.status,
    codexValid,
    proposalStoreAvailable,
    allowedActionClasses: Object.entries(ACTION_CLASS_REQUIRES_APPROVAL)
      .filter(([, requires]) => !requires)
      .map(([actionClass]) => actionClass),
    reasonCodes,
    pendingApprovals: counts.pending,
    expiredApprovals: counts.expired,
    auditIncompleteExecutions: 0,
    mcpDeltasAwaitingReview: 0,
    legacyBypassBlocked: true,
  };
}

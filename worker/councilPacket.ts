import { getAgentGovernanceContext } from "../msh-ops/agent/initAgentGovernance";
import { listMcpProposalLog } from "../msh-ops/mcp/proposalLog";
import type { BackboneEnv } from "./backboneEnv";
import type { AiGatewayEnv } from "./aiGateway";
import { buildPrismCouncilAdvisoryBundle, type PrismCouncilAdvisoryBundle } from "./data/prismCouncilAdvisory";
import { fetchGovernanceStateSafe } from "./kernel";
import { buildTriageSummary } from "./data/prismTriageEngine";
import type { PrismTriageSummary } from "./data/prismTriageTypes";
import { listTriageSummaries, readTriageItem, type PrismTriageStorageEnv } from "./prismTriageStorage";
import type { PrismUiuxStorageEnv } from "./prismUiuxStorage";
import { getAiUsageRollup, getExtendedTelemetry } from "./telemetry";
import type { PolicyMode } from "./policyResponse";
import { countGovernanceProposals, listProposals } from "./governance/proposalStore";
import { getGovernanceSafeModeState } from "./governance/governanceSafeMode";
import { listGovernanceTelemetry } from "./governance/governanceTelemetry";

export interface CouncilPacket {
  assembledAt: string;
  beacon: {
    id: string;
    axis: string[];
    integrityHash: string;
    safeMode: boolean;
  };
  policyMode: PolicyMode;
  aiUsage: Awaited<ReturnType<typeof getAiUsageRollup>>;
  recentGovernanceEvents: { type: string; ts: string; environment: string }[];
  pendingMcpProposals: { proposalId: string; status: string; payloadType: string }[];
  prismAdvisories: PrismCouncilAdvisoryBundle;
  prismTriageSummary?: PrismTriageSummary;
  governanceConsole?: {
    pendingProposalCount: number;
    highRiskProposalCount: number;
    expiredApprovals: number;
    recentReceiptRejections: number;
    recentBeaconDriftBlocks: number;
    recentCodexDriftBlocks: number;
    safeModeActive: boolean;
    approvedAwaitingExecution: number;
    completedAuditBundles: number;
  };
  advisoryOnly: true;
  mutationAuthorized: false;
}

export async function buildCouncilPacket(
  env: BackboneEnv & AiGatewayEnv & PrismUiuxStorageEnv & PrismTriageStorageEnv,
): Promise<CouncilPacket> {
  const [governanceResult, telemetry, aiUsage, prismAdvisories, triageSummaries, approvalCounts, safeMode, governanceEvents] =
    await Promise.all([
    fetchGovernanceStateSafe(env),
    getExtendedTelemetry(env),
    getAiUsageRollup(env),
    buildPrismCouncilAdvisoryBundle(env),
    listTriageSummaries(env).catch(() => []),
    countGovernanceProposals(env),
    getGovernanceSafeModeState(env),
    listGovernanceTelemetry(env, { limit: 100 }),
  ]);

  const triageItems = (
    await Promise.all(triageSummaries.slice(0, 100).map((summary) => readTriageItem(env, summary.triageId)))
  ).filter((item): item is NonNullable<typeof item> => item !== null);
  const prismTriageSummary = buildTriageSummary(triageItems);

  const ctx = getAgentGovernanceContext();
  const pendingMcpProposals = listMcpProposalLog()
    .filter((p) => p.status === "pending_operator_approval")
    .map((p) => ({
      proposalId: p.proposalId,
      status: p.status,
      payloadType: p.payloadType,
    }));

  const policyMode: PolicyMode =
    governanceResult.state.northstar.version >= 2 ? "strict" : "standard";

  const proposals = await listProposals(env);
  const highRisk = proposals.filter(
    (proposal) =>
      proposal.risk_score.qualitative === "high" || proposal.risk_score.qualitative === "critical",
  ).length;
  const approvedAwaiting = proposals.filter((proposal) => proposal.status === "approved").length;
  const receiptRejections = governanceEvents.filter((event) => event.name.includes("rejected")).length;
  const beaconDriftBlocks = governanceEvents.filter((event) => event.reasonCode?.includes("BEACON")).length;
  const codexDriftBlocks = governanceEvents.filter((event) => event.reasonCode?.includes("CODEX")).length;
  const completedBundles = governanceEvents.filter((event) => event.name.includes("execution.succeeded")).length;

  return {
    assembledAt: new Date().toISOString(),
    beacon: {
      id: ctx.beacon.id,
      axis: [...ctx.beacon.axis],
      integrityHash: ctx.integrityHash,
      safeMode: ctx.safeMode,
    },
    policyMode,
    aiUsage,
    recentGovernanceEvents: telemetry.governanceEvents ?? [],
    pendingMcpProposals,
    prismAdvisories,
    prismTriageSummary,
    governanceConsole: {
      pendingProposalCount: approvalCounts.pending,
      highRiskProposalCount: highRisk,
      expiredApprovals: approvalCounts.expired,
      recentReceiptRejections: receiptRejections,
      recentBeaconDriftBlocks: beaconDriftBlocks,
      recentCodexDriftBlocks: codexDriftBlocks,
      safeModeActive: safeMode.active || ctx.safeMode,
      approvedAwaitingExecution: approvedAwaiting,
      completedAuditBundles: completedBundles,
    },
    advisoryOnly: true,
    mutationAuthorized: false,
  };
}

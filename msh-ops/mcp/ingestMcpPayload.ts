import { canonicalizeBeacon, computeBeaconHash } from "../beacon/beaconIntegrity";
import { validateBeaconDocument } from "../beacon/beaconSchema";
import { ensureBeaconLoaded, loadBeacon } from "../beacon/loadBeacon";
import { checkAutonomy } from "../governance/checkAutonomy";
import { getAgentGovernanceContextFor } from "../agent/initAgentGovernance";
import {
  appendMcpProposalLog,
  getMcpProposalById,
  listMcpProposalLog,
} from "./proposalLog";
import type {
  BeaconUpdateProposal,
  McpGovernancePayload,
  McpIngestResult,
} from "./proposalTypes";
import { validateMcpPayload } from "./validateMcpPayload";

const MCP_INGEST_AGENT_ID = "PiecesOsMcpIngest";

export interface PiecesMcpFetchResult {
  payloads: unknown[];
  fetchedAt: string;
  sourceId: "pieces-os-mcp";
}

export type PiecesMcpFetcher = () => Promise<PiecesMcpFetchResult>;

function createProposalId(payload: McpGovernancePayload): string {
  if (payload.proposalId && payload.proposalId.trim().length > 0) {
    return payload.proposalId.trim();
  }
  return `mcp-proposal-${payload.sourceId}-${Date.now()}`;
}

function logMcpProposal(proposal: BeaconUpdateProposal): void {
  console.warn(
    `[MCP_GOVERNANCE_PROPOSAL] id=${proposal.proposalId} type=${proposal.payloadType} status=${proposal.status} source=${proposal.sourceId}`,
  );
}

async function buildProposal(payload: McpGovernancePayload): Promise<BeaconUpdateProposal> {
  await ensureBeaconLoaded();
  const current = loadBeacon();

  const proposal: BeaconUpdateProposal = {
    proposalId: createProposalId(payload),
    sourceId: payload.sourceId,
    payloadType: payload.payloadType,
    status: "pending_operator_approval",
    proposedAt: payload.proposedAt,
    ingestedAt: new Date().toISOString(),
    rationale: payload.rationale ?? "MCP governance proposal — operator review required",
    currentBeaconId: current.beacon.id,
    currentBeaconHash: current.integrityHash,
    mutationRights: "none",
    approvalRequired: true,
  };

  if (payload.payloadType === "northstar-update" && payload.proposedBeacon !== undefined) {
    const proposedBeacon = validateBeaconDocument(payload.proposedBeacon);
    const proposedBeaconHash = await computeBeaconHash(canonicalizeBeacon(proposedBeacon));
    proposal.proposedBeacon = proposedBeacon;
    proposal.proposedBeaconHash = proposedBeaconHash;
  }

  if (payload.payloadType === "governance-signal" && payload.signal) {
    proposal.governanceSignal = payload.signal;
  }

  return proposal;
}

export async function ingestMcpPayload(raw: unknown): Promise<McpIngestResult> {
  const validation = validateMcpPayload(raw);
  if (!validation.valid || !validation.payload) {
    return {
      accepted: false,
      proposal: null,
      errors: validation.errors,
    };
  }

  try {
    const proposal = await buildProposal(validation.payload);
    const logged = appendMcpProposalLog(proposal);
    logMcpProposal(logged);
    return {
      accepted: true,
      proposal: logged,
      errors: [],
    };
  } catch (error) {
    return {
      accepted: false,
      proposal: null,
      errors: [error instanceof Error ? error.message : "MCP ingest failed"],
    };
  }
}

export async function ingestMcpPayloads(rawPayloads: unknown[]): Promise<McpIngestResult[]> {
  const results: McpIngestResult[] = [];
  for (const raw of rawPayloads) {
    results.push(await ingestMcpPayload(raw));
  }
  return results;
}

export async function loadPiecesMcpGovernancePayloads(
  fetcher?: PiecesMcpFetcher,
): Promise<PiecesMcpFetchResult> {
  if (!fetcher) {
    return {
      sourceId: "pieces-os-mcp",
      fetchedAt: new Date().toISOString(),
      payloads: [],
    };
  }
  return fetcher();
}

export async function ingestPiecesMcpGovernanceFeed(
  fetcher?: PiecesMcpFetcher,
): Promise<McpIngestResult[]> {
  const feed = await loadPiecesMcpGovernancePayloads(fetcher);
  return ingestMcpPayloads(feed.payloads);
}

export interface ReviewBeaconProposalInput {
  proposalId: string;
  operatorApproval: boolean;
  reviewNote?: string;
}

export function reviewBeaconProposal(input: ReviewBeaconProposalInput): BeaconUpdateProposal {
  const existing = getMcpProposalById(input.proposalId);
  if (!existing) {
    throw new Error(`Unknown MCP proposal: ${input.proposalId}`);
  }

  const governance = getAgentGovernanceContextFor(MCP_INGEST_AGENT_ID);
  const axis =
    existing.governanceSignal?.axis ??
    existing.proposedBeacon?.axis[0] ??
    "STABILITY";

  const decision = checkAutonomy(
    {
      agentId: MCP_INGEST_AGENT_ID,
      actionKind: "mutate_state",
      description: `Review MCP beacon proposal ${input.proposalId}`,
      axis,
      priorityIndex: existing.governanceSignal?.priorityIndex,
      operatorApproval: input.operatorApproval,
    },
    governance,
  );

  let status: BeaconUpdateProposal["status"] = "pending_operator_approval";
  if (!input.operatorApproval) {
    status = "denied";
  } else if (decision.decision === "allowed") {
    status = "approved";
  } else {
    status = decision.decision === "escalate" ? "escalated" : "denied";
  }

  const reviewed: BeaconUpdateProposal = {
    ...existing,
    status,
    operatorApproval: input.operatorApproval,
    reviewNote:
      input.reviewNote ??
      `${decision.reason} — beacon file is not mutated automatically; operator must apply approved changes manually`,
  };

  appendMcpProposalLog(reviewed);
  logMcpProposal(reviewed);
  return reviewed;
}

export { listMcpProposalLog, getMcpProposalById };
export { assertValidMcpPayload, validateMcpPayload } from "./validateMcpPayload";

import type { Beacon, BeaconAxis } from "../beacon/beaconSchema";

export type McpPayloadType = "northstar-update" | "governance-signal";
export type McpMutationRights = "none";
export type BeaconProposalStatus = "pending_operator_approval" | "approved" | "denied" | "escalated";

export interface McpSourceRegistryEntry {
  id: string;
  type: "governance-source";
  description: string;
  allowedPayloadTypes: McpPayloadType[];
  mutationRights: McpMutationRights;
  approvalRequired: true;
}

export interface McpSourceRegistry {
  sources: McpSourceRegistryEntry[];
}

export interface McpGovernanceSignal {
  axis?: BeaconAxis;
  priorityIndex?: number;
  message: string;
  severity?: "info" | "low" | "medium" | "high";
}

export interface McpGovernancePayload {
  sourceId: string;
  payloadType: McpPayloadType;
  proposedAt: string;
  proposalId?: string;
  rationale?: string;
  proposedBeacon?: unknown;
  signal?: McpGovernanceSignal;
  metadata?: Record<string, unknown>;
}

export interface BeaconUpdateProposal {
  proposalId: string;
  sourceId: string;
  payloadType: McpPayloadType;
  status: BeaconProposalStatus;
  proposedAt: string;
  ingestedAt: string;
  rationale: string;
  currentBeaconId: string;
  currentBeaconHash: string;
  proposedBeacon?: Beacon;
  proposedBeaconHash?: string;
  governanceSignal?: McpGovernanceSignal;
  mutationRights: "none";
  approvalRequired: true;
  operatorApproval?: boolean;
  reviewNote?: string;
}

export interface McpIngestResult {
  accepted: boolean;
  proposal: BeaconUpdateProposal | null;
  errors: string[];
}

export interface McpValidationResult {
  valid: boolean;
  errors: string[];
  source?: McpSourceRegistryEntry;
  payload?: McpGovernancePayload;
}

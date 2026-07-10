export type CustomerBeaconTierId = "beacon-core" | "beacon-governance-pro" | "beacon-enterprise";
export type CustomerBeaconState = "active";

export interface CustomerBeaconAuthority {
  operatorRetainsExecutionAuthority: boolean;
  councilAuthority: "advisory-only";
  agentExecutionRequiresApproval: boolean;
}

export interface CustomerBeaconAgentRules {
  mustLoadAtInitialization: boolean;
  mustReferenceBeacon: boolean;
  mustEscalateDeviation: boolean;
  mustAlignSuggestions: boolean;
}

export interface CustomerBeaconAutonomy {
  mutationAllowed: false;
  operatorApprovalRequired: boolean;
  maxRecursionDepth: number;
  terminationConditions: string[];
  escalationConditions: string[];
}

export interface CustomerBeaconAudit {
  hashAlgorithm: "sha256";
  proposalLoggingRequired: boolean;
  approvalLoggingRequired: boolean;
}

export interface CustomerGovernanceSource {
  id: string;
  type: string;
  mutationRights: "none";
  approvalRequired: true;
}

export interface CustomerBeaconDocument {
  version: string;
  state: CustomerBeaconState;
  organization: string;
  northstar: string;
  strategicAxis: string[];
  priorities: string[];
  authority: CustomerBeaconAuthority;
  agentRules: CustomerBeaconAgentRules;
  autonomy: CustomerBeaconAutonomy;
  governanceSources: CustomerGovernanceSource[];
  audit: CustomerBeaconAudit;
}

export interface NorthstarBeaconIntakeInput {
  organization_name: string;
  strategic_northstar: string;
  strategic_axis: string[];
  priorities: string[];
  prohibited_actions: string[];
  approval_required_actions: string[];
  agent_roles: string[];
  agent_permissions: string[];
  allowed_governance_sources: string[];
  mutation_policy: string;
  escalation_rules: string[];
  recursion_depth_limit: number;
  termination_conditions: string[];
  audit_requirements: string[];
  deployment_environment: string;
  preferred_language: string;
  compliance_framework?: string;
  selected_tier: CustomerBeaconTierId;
  source_type?: string;
  source_reference_id?: string;
  source_route?: string;
  buyer_email?: string;
  assisted_implementation?: boolean;
}

export interface CustomerBeaconPackageFile {
  path: string;
  content: string;
}

export interface CustomerBeaconPackageResult {
  order_id: string;
  tier_id: CustomerBeaconTierId;
  tier_name: string;
  tier_price: number;
  beacon: CustomerBeaconDocument;
  integrity_hash: string;
  files: CustomerBeaconPackageFile[];
  configuration_summary: Record<string, unknown>;
  license_notice: string;
  product_boundary: string;
  implementation_checklist: string[];
  telemetry: Record<string, string>;
}

export interface CustomerBeaconProposal {
  proposal_id: string;
  order_id: string;
  source_id: string;
  payload_type: "northstar-update" | "governance-signal";
  status: "pending_operator_approval" | "approved" | "denied" | "escalated";
  created_at: string;
  rationale: string;
  signal_message?: string;
  proposed_beacon_hash?: string;
  current_beacon_hash: string;
  operator_approval?: boolean;
}

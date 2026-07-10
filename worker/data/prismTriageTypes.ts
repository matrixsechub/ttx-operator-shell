export const PRISM_TRIAGE_STATUSES = [
  "new",
  "reviewing",
  "proposal_ready",
  "accepted_for_planning",
  "deferred",
  "dismissed",
  "superseded",
] as const;

export type PrismTriageStatus = (typeof PRISM_TRIAGE_STATUSES)[number];

export const PRISM_PATCH_PROPOSAL_RISKS = ["low", "medium", "high", "critical"] as const;
export type PrismPatchProposalRisk = (typeof PRISM_PATCH_PROPOSAL_RISKS)[number];

export const PRISM_PATCH_COMPLEXITIES = ["small", "medium", "large"] as const;
export type PrismPatchComplexity = (typeof PRISM_PATCH_COMPLEXITIES)[number];

export const PRISM_TRIAGE_DISPOSITION_STATUSES = [
  "accepted_for_planning",
  "deferred",
  "dismissed",
] as const;

export type PrismTriageDispositionStatus = (typeof PRISM_TRIAGE_DISPOSITION_STATUSES)[number];

export type PrismTriageSeverity = "low" | "medium" | "high" | "critical";

export interface PrismPatchStep {
  order: number;
  description: string;
  rationale: string;
  suggestedFiles: string[];
  verification: string[];
}

export interface PrismPatchTest {
  testType: "unit" | "integration" | "browser" | "accessibility" | "responsive" | "manual";
  description: string;
  required: boolean;
}

export interface PrismProposalGovernance {
  advisoryOnly: true;
  mutationAuthorized: false;
  operatorApprovalRequired: true;
  sourceAuditId: string;
  sourceFindingIds: string[];
  sourceEvidenceHash: string;
  proposalEvidenceHash: string;
  revision: number;
}

export interface PrismTriageItem {
  triageId: string;
  sourceAuditId: string;
  sourceFindingIds: string[];
  sourceCouncilPacketId?: string;
  title: string;
  routes: string[];
  viewports: string[];
  categories: string[];
  highestSeverity: PrismTriageSeverity;
  priorityScore: number;
  status: PrismTriageStatus;
  userImpact: string;
  evidenceSummary: string;
  recommendation: string;
  acceptanceCriteria: string[];
  createdAt: string;
  updatedAt: string;
  advisoryOnly: true;
  mutationAuthorized: false;
  operatorDecisionRequired: true;
  evidenceHash: string;
  dispositionReason?: string;
}

export interface PrismPatchProposal {
  proposalId: string;
  triageId: string;
  sourceAuditId: string;
  title: string;
  objective: string;
  affectedRoutes: string[];
  affectedComponents: string[];
  suspectedFiles: string[];
  implementationPlan: PrismPatchStep[];
  testPlan: PrismPatchTest[];
  rollbackPlan: string[];
  telemetryRequirements: string[];
  accessibilityRequirements: string[];
  acceptanceCriteria: string[];
  estimatedComplexity: PrismPatchComplexity;
  risk: PrismPatchProposalRisk;
  dependencies: string[];
  blockedActions: string[];
  generatedAt: string;
  advisoryOnly: true;
  mutationAuthorized: false;
  operatorApprovalRequired: true;
  evidenceHash: string;
  governance: PrismProposalGovernance;
  ai_enrichment?: string;
  ai_model?: string;
}

export interface PrismTriageSummary {
  total: number;
  critical: number;
  high: number;
  proposalReady: number;
  operatorDecisionRequired: number;
}

export type PrismTriageItemSummary = Pick<
  PrismTriageItem,
  | "triageId"
  | "sourceAuditId"
  | "title"
  | "routes"
  | "highestSeverity"
  | "priorityScore"
  | "status"
  | "createdAt"
  | "updatedAt"
  | "advisoryOnly"
  | "mutationAuthorized"
  | "operatorDecisionRequired"
>;

export type PrismPatchProposalSummary = Pick<
  PrismPatchProposal,
  | "proposalId"
  | "triageId"
  | "sourceAuditId"
  | "title"
  | "risk"
  | "estimatedComplexity"
  | "generatedAt"
  | "advisoryOnly"
  | "mutationAuthorized"
  | "operatorApprovalRequired"
  | "governance"
>;

export function isPrismTriageStatus(value: string): value is PrismTriageStatus {
  return (PRISM_TRIAGE_STATUSES as readonly string[]).includes(value);
}

export function isPrismTriageDispositionStatus(value: string): value is PrismTriageDispositionStatus {
  return (PRISM_TRIAGE_DISPOSITION_STATUSES as readonly string[]).includes(value);
}

export function assertPrismTriageInvariants(item: PrismTriageItem): void {
  if (item.advisoryOnly !== true) {
    throw new Error("PRISM triage advisoryOnly invariant violated");
  }
  if (item.mutationAuthorized !== false) {
    throw new Error("PRISM triage mutationAuthorized invariant violated");
  }
  if (item.operatorDecisionRequired !== true) {
    throw new Error("PRISM triage operatorDecisionRequired invariant violated");
  }
}

export function assertPrismPatchProposalInvariants(proposal: PrismPatchProposal): void {
  if (proposal.advisoryOnly !== true) {
    throw new Error("PRISM patch proposal advisoryOnly invariant violated");
  }
  if (proposal.mutationAuthorized !== false) {
    throw new Error("PRISM patch proposal mutationAuthorized invariant violated");
  }
  if (proposal.operatorApprovalRequired !== true) {
    throw new Error("PRISM patch proposal operatorApprovalRequired invariant violated");
  }
  if (proposal.governance.mutationAuthorized !== false) {
    throw new Error("PRISM patch proposal governance mutationAuthorized invariant violated");
  }
}

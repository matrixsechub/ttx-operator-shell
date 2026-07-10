export type PrismTriageStatus =
  | "new"
  | "reviewing"
  | "proposal_ready"
  | "accepted_for_planning"
  | "deferred"
  | "dismissed"
  | "superseded";

export type PrismTriageDispositionStatus = "accepted_for_planning" | "deferred" | "dismissed";

export type PrismTriageSeverity = "low" | "medium" | "high" | "critical";

export type PrismPatchProposalRisk = "low" | "medium" | "high" | "critical";

export type PrismPatchComplexity = "small" | "medium" | "large";

export type PrismPatchStep = {
  order: number;
  description: string;
  rationale: string;
  suggestedFiles: string[];
  verification: string[];
};

export type PrismPatchTest = {
  testType: "unit" | "integration" | "browser" | "accessibility" | "responsive" | "manual";
  description: string;
  required: boolean;
};

export type PrismProposalGovernance = {
  advisoryOnly: true;
  mutationAuthorized: false;
  operatorApprovalRequired: true;
  sourceAuditId: string;
  sourceFindingIds: string[];
  sourceEvidenceHash: string;
  proposalEvidenceHash: string;
  revision: number;
};

export type PrismTriageItem = {
  triageId: string;
  sourceAuditId: string;
  sourceFindingIds: string[];
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
};

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

export type PrismPatchProposal = {
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
};

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

export type PrismTriageSummary = {
  total: number;
  critical: number;
  high: number;
  proposalReady: number;
  operatorDecisionRequired: number;
};

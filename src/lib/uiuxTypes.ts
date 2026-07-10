export const PRISM_UIUX_AGENT_ID = "PRISM_UIUX_AGENT_V1" as const;

export type UiUxAuditMode =
  | "AUDIT_ROUTE"
  | "AUDIT_FLOW"
  | "AUDIT_COMPONENT"
  | "ACCESSIBILITY_CHECK"
  | "DESIGN_SYSTEM_CHECK"
  | "CONVERSION_REVIEW"
  | "COMPARE_STATES"
  | "PATCH_PROPOSAL"
  | "ACCEPTANCE_REVIEW";

export type UiUxViewport = "mobile" | "tablet" | "desktop" | "all";

export type UiUxFindingSeverity = "critical" | "high" | "medium" | "low" | "info";
export type UiUxFindingStatus = "open" | "accepted" | "rejected" | "resolved" | "deferred";

export type UiUxFindingCategory =
  | "usability"
  | "accessibility"
  | "responsive"
  | "visual_hierarchy"
  | "design_system"
  | "conversion"
  | "feedback_states"
  | "performance";

export type UiUxReleaseRecommendation =
  | "PASS"
  | "PASS_WITH_ADVISORIES"
  | "CHANGES_REQUIRED"
  | "BLOCK_RELEASE";

export type UiUxAuditRequest = {
  mode: UiUxAuditMode;
  routes?: string[];
  component?: string;
  viewport: UiUxViewport;
  useFixture?: boolean;
  useLiveEvidence?: boolean;
  captureId?: string;
  idempotencyKey?: string;
  notes?: string;
};

export type UiUxEvidence = {
  type: "metadata" | "fixture" | "interaction" | "screenshot_ref" | "checklist" | "browser";
  source: string;
  summary: string;
  detail?: string;
  capturedAt: string;
};

export type UiUxScorecard = {
  overall: number;
  usability: number;
  accessibility: number;
  responsive: number;
  visualHierarchy: number;
  designSystem: number;
  conversion: number;
  feedbackStates: number;
  performance: number;
  weights: {
    usability: number;
    accessibility: number;
    responsive: number;
    visualHierarchy: number;
    designSystem: number;
    conversion: number;
    feedbackStates: number;
    performance: number;
  };
};

export type UiUxFinding = {
  id: string;
  auditId: string;
  route?: string;
  component?: string;
  viewport: UiUxViewport;
  category: UiUxFindingCategory;
  severity: UiUxFindingSeverity;
  evidence: UiUxEvidence[];
  userImpact: string;
  recommendation: string;
  implementationHint?: string;
  acceptanceCriteria: string[];
  confidence: number;
  status: UiUxFindingStatus;
};

export type UiUxPatchProposal = {
  id: string;
  auditId: string;
  findingId: string;
  filePath: string;
  description: string;
  diffPreview: string;
  advisoryOnly: true;
  requiresOperatorApproval: true;
};

export type UiUxApprovalRecord = {
  id: string;
  auditId: string;
  action: "approve" | "reject";
  findingIds: string[];
  patchProposalIds?: string[];
  operatorNote?: string;
  recordedAt: string;
  mutationAuthorized: false;
};

export type PrismCouncilEnvelope = {
  agentId: typeof PRISM_UIUX_AGENT_ID;
  advisoryOnly: true;
  problemFrame: string;
  consensus: string;
  activeDisagreements: string[];
  recommendedPath: string;
};

export type UiUxAuditSummary = {
  auditId: string;
  mode: UiUxAuditMode;
  routes: string[];
  component?: string;
  viewport: UiUxViewport;
  overallScore: number;
  releaseRecommendation: UiUxReleaseRecommendation;
  findingCount: number;
  criticalCount: number;
  createdAt: string;
  evidenceHash: string;
};

export type UiUxAudit = {
  auditId: string;
  agentId: typeof PRISM_UIUX_AGENT_ID;
  advisoryOnly: true;
  mode: UiUxAuditMode;
  routes: string[];
  component?: string;
  viewport: UiUxViewport;
  request: UiUxAuditRequest;
  scorecard: UiUxScorecard;
  releaseRecommendation: UiUxReleaseRecommendation;
  findings: UiUxFinding[];
  patchProposals?: UiUxPatchProposal[];
  approvals: UiUxApprovalRecord[];
  evidenceHash: string;
  createdAt: string;
  updatedAt: string;
  ai_model?: string;
  ai_latency_ms?: number;
  ai_enrichment?: string;
  councilEnvelope: PrismCouncilEnvelope;
};

export const UIUX_AUDIT_MODES: UiUxAuditMode[] = [
  "AUDIT_ROUTE",
  "AUDIT_FLOW",
  "AUDIT_COMPONENT",
  "ACCESSIBILITY_CHECK",
  "DESIGN_SYSTEM_CHECK",
  "CONVERSION_REVIEW",
  "COMPARE_STATES",
  "PATCH_PROPOSAL",
  "ACCEPTANCE_REVIEW",
];

export const UIUX_VIEWPORTS: UiUxViewport[] = ["mobile", "tablet", "desktop", "all"];

export const FIXTURE_ROUTE_PRESETS = [
  "/",
  "/services",
  "/enter",
  "/register",
  "/intake",
  "/status",
  "/apps/automation-builder",
  "/apps/security-fleet",
];

export const SEVERITY_ORDER: UiUxFindingSeverity[] = ["critical", "high", "medium", "low", "info"];

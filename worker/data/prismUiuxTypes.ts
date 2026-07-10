export const PRISM_UIUX_AGENT_ID = "PRISM_UIUX_AGENT_V1" as const;

export const UIUX_AUDIT_MODES = [
  "AUDIT_ROUTE",
  "AUDIT_FLOW",
  "AUDIT_COMPONENT",
  "ACCESSIBILITY_CHECK",
  "DESIGN_SYSTEM_CHECK",
  "CONVERSION_REVIEW",
  "COMPARE_STATES",
  "PATCH_PROPOSAL",
  "ACCEPTANCE_REVIEW",
] as const;

export type UiUxAuditMode = (typeof UIUX_AUDIT_MODES)[number];

export const UIUX_VIEWPORTS = ["mobile", "tablet", "desktop", "all"] as const;
export type UiUxViewport = (typeof UIUX_VIEWPORTS)[number];

export const UIUX_FINDING_SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;
export type UiUxFindingSeverity = (typeof UIUX_FINDING_SEVERITIES)[number];

export const UIUX_FINDING_STATUSES = ["open", "accepted", "rejected", "resolved", "deferred"] as const;
export type UiUxFindingStatus = (typeof UIUX_FINDING_STATUSES)[number];

export const UIUX_FINDING_CATEGORIES = [
  "usability",
  "accessibility",
  "responsive",
  "visual_hierarchy",
  "design_system",
  "conversion",
  "feedback_states",
  "performance",
] as const;
export type UiUxFindingCategory = (typeof UIUX_FINDING_CATEGORIES)[number];

export const UIUX_RELEASE_RECOMMENDATIONS = [
  "PASS",
  "PASS_WITH_ADVISORIES",
  "CHANGES_REQUIRED",
  "BLOCK_RELEASE",
] as const;
export type UiUxReleaseRecommendation = (typeof UIUX_RELEASE_RECOMMENDATIONS)[number];

export type UiUxRouteMetadata = {
  route: string;
  title?: string;
  hasLoadingState?: boolean;
  hasErrorState?: boolean;
  hasEmptyState?: boolean;
  hasSuccessState?: boolean;
  touchTargetMinPx?: number;
  usesOpPanel?: boolean;
  usesOpAccent?: boolean;
  usesMonospace?: boolean;
  ctaCount?: number;
  formFieldCount?: number;
  stepCount?: number;
  tableColumnCount?: number;
  horizontalScrollRequired?: boolean;
  labelAssociated?: boolean;
  focusVisible?: boolean;
  contrastRatio?: number;
};

export type UiUxComponentMetadata = {
  component: string;
  filePath?: string;
  props?: string[];
  usesOpPanel?: boolean;
  usesOpAccent?: boolean;
  usesMonospace?: boolean;
};

export type UiUxInteractionResult = {
  action: string;
  success: boolean;
  durationMs?: number;
  errorMessage?: string;
};

export type UiUxAuditRequest = {
  mode: UiUxAuditMode;
  routes?: string[];
  component?: string;
  viewport: UiUxViewport;
  useFixture?: boolean;
  routeMetadata?: UiUxRouteMetadata[];
  componentMetadata?: UiUxComponentMetadata;
  interactionResults?: UiUxInteractionResult[];
  screenshotRefs?: string[];
  compareBefore?: UiUxRouteMetadata | UiUxComponentMetadata;
  compareAfter?: UiUxRouteMetadata | UiUxComponentMetadata;
  notes?: string;
};

export type UiUxEvidence = {
  type: "metadata" | "fixture" | "interaction" | "screenshot_ref" | "checklist";
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
  councilEnvelope: import("./prismUiuxCouncil").PrismCouncilEnvelope;
};

export function isUiUxAuditMode(value: string): value is UiUxAuditMode {
  return (UIUX_AUDIT_MODES as readonly string[]).includes(value);
}

export function isUiUxViewport(value: string): value is UiUxViewport {
  return (UIUX_VIEWPORTS as readonly string[]).includes(value);
}

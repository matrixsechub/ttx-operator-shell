import type { PrismBrowserEvidence, PrismCaptureManifest } from "../types.ts";

export type PrismStagingEnvironment = "staging" | "local_preview" | "local_dev";

export type RouteValidationResult =
  | "pass"
  | "pass_with_warning"
  | "route_mismatch"
  | "unauthorized_redirect"
  | "missing_surface_marker"
  | "unavailable"
  | "capture_failed";

export type PrismRouteProbeResult = {
  route: string;
  status: number;
  ok: boolean;
  contentType?: string;
};

export type PrismStagingPreflight = {
  origin: string;
  canonicalOrigin: string;
  environment: PrismStagingEnvironment;
  checkedAt: string;
  healthStatus: "ok" | "degraded" | "failed";
  buildCommit?: string;
  buildTimestamp?: string;
  appVersion?: string;
  deployEnv?: string;
  routeProbeResults: PrismRouteProbeResult[];
  authEndpointStatus: "ok" | "unavailable" | "failed";
  prismEndpointStatus: "ok" | "unavailable" | "failed";
  warnings: string[];
  failures: string[];
  evidenceHash: string;
  passed: boolean;
};

export type PrismRouteTruthRow = {
  route: string;
  expectedSurface: string;
  observedSurface: string;
  requestedStatus?: number;
  finalStatus?: number;
  finalUrl: string;
  redirectCount: number;
  markerMatched: boolean;
  renderStatus: "complete" | "failed";
  validationResult: RouteValidationResult;
};

export type PrismRouteTruthMatrix = {
  origin: string;
  rows: PrismRouteTruthRow[];
  evidenceHash: string;
  passed: boolean;
};

export type PrismStagingSubmissionProof = {
  captureId: string;
  idempotencyKeyHash: string;
  auditId: string;
  firstSubmissionStatus: number;
  duplicateSubmissionStatus: number;
  fetchedAuditMatched: boolean;
  persisted: boolean;
  duplicatePrevented: boolean;
  advisoryOnly: boolean;
  mutationAuthorized: false;
  councilEnvelopePresent: boolean;
  evidenceHash: string;
  completedAt: string;
  passed: boolean;
};

export type PrismFixtureDriftClassification =
  | "none"
  | "expected"
  | "fixture_stale"
  | "live_regression"
  | "inconclusive";

export type PrismFixtureDriftRow = {
  route: string;
  viewport: string;
  classification: PrismFixtureDriftClassification;
  expectedFixtureFinding?: string;
  liveViolationCount: number;
  consoleErrorCount: number;
  failedRequestCount: number;
  horizontalOverflow: boolean;
  landmarkCount: number;
  headingCount: number;
  staleFixtureFindings: string[];
  newlyObservedFindings: string[];
  notes: string[];
};

export type PrismFixtureDriftReport = {
  fixtureVersion: string;
  origin: string;
  rows: PrismFixtureDriftRow[];
  overallClassification: PrismFixtureDriftClassification;
  recommendedFixtureUpdates: string[];
  evidenceHash: string;
};

export type AdvisorySummaryLevel =
  | "pass"
  | "advisory"
  | "changes_recommended"
  | "release_review_required";

export type PrismAdvisorySummary = {
  level: AdvisorySummaryLevel;
  infrastructureFailures: string[];
  advisoryFlags: string[];
  thresholdBreaches: string[];
  evidenceHash: string;
};

export type PrismStagingGovernance = {
  runId: string;
  captureId: string;
  actorType: "ci" | "operator" | "local";
  targetOriginClass: "staging";
  canonicalOrigin: string;
  environment: PrismStagingEnvironment;
  routeScope: "public" | "operator" | "mixed";
  authenticatedRoutes: string[];
  publicRoutes: string[];
  productionDenied: true;
  arbitraryOriginDenied: true;
  artifactRetentionClass: "staging_review" | "ephemeral_ci";
  advisoryOnly: true;
  mutationAuthorized: false;
  approvalRequired: true;
  submittedAuditId?: string;
  fixtureDriftStatus: PrismFixtureDriftClassification;
  evidenceHash: string;
  timestamp: string;
};

export type PrismPerformanceProbeResult = {
  enabled: boolean;
  route: string;
  viewport: string;
  firstContentfulPaintMs?: number;
  largestContentfulPaintMs?: number;
  cumulativeLayoutShift?: number;
  totalBlockingTimeMs?: number;
  navigationDurationMs?: number;
  evidenceHash: string;
};

export type PrismStagingValidationResult = {
  runId: string;
  captureId: string;
  origin: string;
  preflight: PrismStagingPreflight;
  publicManifest?: PrismCaptureManifest;
  operatorManifest?: PrismCaptureManifest;
  routeTruth: PrismRouteTruthMatrix;
  submissionProof?: PrismStagingSubmissionProof;
  fixtureDrift: PrismFixtureDriftReport;
  advisorySummary: PrismAdvisorySummary;
  performance?: PrismPerformanceProbeResult[];
  governance: PrismStagingGovernance;
  secretScanPassed: boolean;
  passed: boolean;
  completedAt: string;
};

export type PrismStagingCaptureBundle = {
  publicManifest: PrismCaptureManifest;
  operatorManifest?: PrismCaptureManifest;
  publicEvidence: PrismBrowserEvidence[];
  operatorEvidence?: PrismBrowserEvidence[];
};

export const PRISM_TRIAGE_ROUTE_CONTRACTS = [
  { method: "GET", path: "/api/operator/uiux/triage" },
  { method: "POST", path: "/api/operator/uiux/triage/generate" },
  { method: "GET", path: "/api/operator/uiux/proposals" },
] as const;

export type PrismStagingTriageProofPacket = {
  environment: "staging";
  runId: string;
  buildSha?: string;
  buildShaMatched: boolean;
  operatorAuthenticated: boolean;
  triageRoutesReachable: boolean;
  triageGenerated: boolean;
  triageIdempotent: boolean;
  proposalGenerated: boolean;
  proposalRetrieved: boolean;
  dispositionRecorded: boolean;
  sourceAuditUnchanged: boolean;
  hsxSummaryUpdated: boolean;
  auditEventRecorded: boolean;
  executionFieldsRejected: boolean;
  secretViolations: number;
  advisoryOnly: true;
  operatorApprovalRequired: true;
  mutationAuthorized: false;
  sourceMutationObserved: false;
  githubWriteObserved: false;
  marketplacePublicationObserved: false;
  deploymentTriggeredByPrism: false;
  evidenceHash: string;
  completedAt: string;
  passed: boolean;
};

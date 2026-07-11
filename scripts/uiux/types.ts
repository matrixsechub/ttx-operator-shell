/**
 * PRISM Phase 2A — browser capture evidence types.
 * Shared by scripts/uiux capture engine and unit tests.
 */

export type PrismOriginClass = "local_dev" | "local_preview" | "staging" | "production_public";

export type PrismCaptureStatus = "complete" | "failed" | "partial";

export type PrismAccessibilityViolation = {
  id: string;
  impact: "critical" | "serious" | "moderate" | "minor" | "unknown";
  ruleId: string;
  description: string;
  help: string;
  nodes: number;
};

export type PrismConsoleEvidence = {
  type: "error" | "warning";
  message: string;
  location?: string;
};

export type PrismNetworkEvidence = {
  url: string;
  method: string;
  status?: number;
  failureText?: string;
};

export type PrismInteractionEvidence = {
  action: string;
  success: boolean;
  durationMs?: number;
  errorMessage?: string;
};

export type PrismScreenshotEvidence = {
  ref: string;
  viewport: string;
  clipped: boolean;
  masked: boolean;
};

export type PrismViewportEvidence = {
  name: "mobile" | "tablet" | "desktop";
  width: number;
  height: number;
  deviceScaleFactor: number;
  colorScheme: "light" | "dark";
  reducedMotion: boolean;
};

export type PrismBrowserEvidence = {
  captureId: string;
  route: string;
  originClass: PrismOriginClass;
  origin: string;
  viewport: PrismViewportEvidence;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  browser: string;
  pageTitle: string;
  finalUrl: string;
  httpStatus?: number;
  redirectChain: string[];
  consoleErrors: PrismConsoleEvidence[];
  pageErrors: string[];
  failedRequests: PrismNetworkEvidence[];
  accessibilityViolations: PrismAccessibilityViolation[];
  landmarks: string[];
  headingOutline: string[];
  interactiveElementCount: number;
  linkCount: number;
  focusOrder: string[];
  horizontalOverflow: boolean;
  hasMainLandmark: boolean;
  hasLoadingIndicator: boolean;
  hasEmptyStateText: boolean;
  screenshot: PrismScreenshotEvidence;
  interactions: PrismInteractionEvidence[];
  evidenceHash: string;
  status: PrismCaptureStatus;
  errorMessage?: string;
};

export type PrismCaptureFailure = {
  route: string;
  viewport: string;
  message: string;
  startedAt: string;
  completedAt: string;
};

export type PrismCaptureGovernance = {
  captureId: string;
  actorType: "operator" | "ci" | "local";
  targetOriginClass: PrismOriginClass;
  routeScope: "public" | "operator" | "mixed";
  requestedMode: string;
  approvedRouteCount: number;
  artifactRetentionClass: "ephemeral_ci" | "local_dev" | "staging_review";
  authenticationRequired: boolean;
  productionTargetDenied: boolean;
  mutationAuthorized: false;
  evidenceHash: string;
  timestamp: string;
};

export type PrismCaptureManifest = {
  captureId: string;
  origin: string;
  originClass: PrismOriginClass;
  actorType: "operator" | "ci" | "local";
  startedAt: string;
  completedAt: string;
  routes: string[];
  viewports: string[];
  browser: string;
  dryRun: boolean;
  authenticationRequired: boolean;
  governance: PrismCaptureGovernance;
  evidence: PrismBrowserEvidence[];
  failures: PrismCaptureFailure[];
  idempotencyKey: string;
  evidenceHash: string;
  status: PrismCaptureStatus;
};

export type PrismTelemetryEvent = {
  event:
    | "prism_capture_started"
    | "prism_capture_route_started"
    | "prism_capture_route_completed"
    | "prism_capture_route_failed"
    | "prism_accessibility_scan_completed"
    | "prism_evidence_generated"
    | "prism_audit_submitted"
    | "prism_audit_submission_failed";
  captureId: string;
  routeHash?: string;
  route?: string;
  viewport?: string;
  durationMs?: number;
  violationCount?: number;
  consoleErrorCount?: number;
  failedRequestCount?: number;
  status?: string;
  environment?: string;
  evidenceHash?: string;
  timestamp: string;
};

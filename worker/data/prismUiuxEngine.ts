import { buildPrismCouncilEnvelope } from "./prismUiuxCouncil";
import { getFixtureForRoute, PRISM_FIXTURE_VERSION, resolveFixtureMetadata } from "./prismUiuxFixtures";
import type {
  UiUxAudit,
  UiUxAuditMode,
  UiUxAuditRequest,
  UiUxComponentMetadata,
  UiUxEvidence,
  UiUxFinding,
  UiUxFindingSeverity,
  UiUxPatchProposal,
  UiUxReleaseRecommendation,
  UiUxRouteMetadata,
  UiUxScorecard,
  UiUxViewport,
} from "./prismUiuxTypes";
import { PRISM_UIUX_AGENT_ID } from "./prismUiuxTypes";

const SCORE_WEIGHTS = {
  usability: 25,
  accessibility: 20,
  responsive: 15,
  visualHierarchy: 10,
  designSystem: 10,
  conversion: 10,
  feedbackStates: 5,
  performance: 5,
} as const;

const MAX_FINDINGS = 20;

const ROUTE_MODES: UiUxAuditMode[] = ["AUDIT_ROUTE", "AUDIT_FLOW", "ACCESSIBILITY_CHECK", "CONVERSION_REVIEW", "ACCEPTANCE_REVIEW"];
const COMPONENT_MODES: UiUxAuditMode[] = ["AUDIT_COMPONENT", "DESIGN_SYSTEM_CHECK", "PATCH_PROPOSAL"];

export class PrismUiuxValidationError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const FORBIDDEN_KEYS = ["executableCode", "externalUrl", "rawHtml"] as const;

const ROUTE_PATTERN = /^\/[a-zA-Z0-9/_-]*$/;

export function validateUiUxAuditRequest(body: Record<string, unknown>): UiUxAuditRequest {
  for (const key of FORBIDDEN_KEYS) {
    if (key in body) {
      throw new PrismUiuxValidationError(400, `Field ${key} is not allowed`);
    }
  }

  const mode = body.mode;
  if (typeof mode !== "string" || !isValidMode(mode)) {
    throw new PrismUiuxValidationError(400, "Unknown or missing audit mode");
  }

  const viewport = body.viewport;
  if (typeof viewport !== "string" || !isValidViewport(viewport)) {
    throw new PrismUiuxValidationError(400, "Invalid viewport");
  }

  const routes = normalizeRoutes(body.routes);
  const component = typeof body.component === "string" ? body.component.trim() : undefined;

  if (ROUTE_MODES.includes(mode) && routes.length === 0) {
    throw new PrismUiuxValidationError(400, "At least one route is required for this mode");
  }
  if (COMPONENT_MODES.includes(mode) && !component) {
    throw new PrismUiuxValidationError(400, "Component scope is required for this mode");
  }
  if (routes.length > 8) {
    throw new PrismUiuxValidationError(400, "Maximum 8 routes allowed");
  }
  for (const route of routes) {
    if (!ROUTE_PATTERN.test(route)) {
      throw new PrismUiuxValidationError(400, `Invalid route: ${route}`);
    }
  }

  if (mode === "COMPARE_STATES" && (!body.compareBefore || !body.compareAfter)) {
    throw new PrismUiuxValidationError(400, "compareBefore and compareAfter are required for COMPARE_STATES");
  }

  if (body.screenshotRefs !== undefined) {
    if (!Array.isArray(body.screenshotRefs) || body.screenshotRefs.some((r) => typeof r !== "string")) {
      throw new PrismUiuxValidationError(400, "screenshotRefs must be an array of strings");
    }
    if (body.screenshotRefs.some((r) => /^https?:\/\//i.test(r))) {
      throw new PrismUiuxValidationError(400, "External URLs in screenshotRefs are not allowed");
    }
  }

  return {
    mode,
    routes: routes.length > 0 ? routes : undefined,
    component,
    viewport,
    useFixture: body.useFixture === true,
    routeMetadata: parseRouteMetadata(body.routeMetadata),
    componentMetadata: parseComponentMetadata(body.componentMetadata),
    interactionResults: parseInteractionResults(body.interactionResults),
    screenshotRefs: Array.isArray(body.screenshotRefs) ? (body.screenshotRefs as string[]) : undefined,
    compareBefore: parseCompareMeta(body.compareBefore),
    compareAfter: parseCompareMeta(body.compareAfter),
    notes: typeof body.notes === "string" ? body.notes.slice(0, 2000) : undefined,
  };
}

function isValidMode(mode: string): mode is UiUxAuditMode {
  return [
    "AUDIT_ROUTE",
    "AUDIT_FLOW",
    "AUDIT_COMPONENT",
    "ACCESSIBILITY_CHECK",
    "DESIGN_SYSTEM_CHECK",
    "CONVERSION_REVIEW",
    "COMPARE_STATES",
    "PATCH_PROPOSAL",
    "ACCEPTANCE_REVIEW",
  ].includes(mode);
}

function isValidViewport(viewport: string): viewport is UiUxViewport {
  return ["mobile", "tablet", "desktop", "all"].includes(viewport);
}

function normalizeRoutes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((r): r is string => typeof r === "string")
    .map((r) => {
      const trimmed = r.trim();
      return trimmed === "" ? "/" : trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    });
}

function parseRouteMetadata(value: unknown): UiUxRouteMetadata[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is UiUxRouteMetadata => typeof item === "object" && item !== null && typeof (item as UiUxRouteMetadata).route === "string");
}

function parseComponentMetadata(value: unknown): UiUxComponentMetadata | undefined {
  if (!value || typeof value !== "object") return undefined;
  const obj = value as UiUxComponentMetadata;
  if (typeof obj.component !== "string") return undefined;
  return obj;
}

function parseCompareMeta(value: unknown): UiUxRouteMetadata | UiUxComponentMetadata | undefined {
  if (!value || typeof value !== "object") return undefined;
  const obj = value as Record<string, unknown>;
  if (typeof obj.route === "string") return obj as UiUxRouteMetadata;
  if (typeof obj.component === "string") return obj as UiUxComponentMetadata;
  return undefined;
}

function parseInteractionResults(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value.filter(
    (item): item is { action: string; success: boolean; durationMs?: number; errorMessage?: string } =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as { action: unknown }).action === "string" &&
      typeof (item as { success: unknown }).success === "boolean",
  );
}

export async function computeEvidenceHash(request: UiUxAuditRequest): Promise<string> {
  const canonical = JSON.stringify({
    fixtureVersion: PRISM_FIXTURE_VERSION,
    mode: request.mode,
    routes: request.routes ?? [],
    component: request.component ?? null,
    viewport: request.viewport,
    useFixture: request.useFixture ?? false,
    routeMetadata: request.routeMetadata ?? [],
    componentMetadata: request.componentMetadata ?? null,
    interactionResults: request.interactionResults ?? [],
    screenshotRefs: request.screenshotRefs ?? [],
    compareBefore: request.compareBefore ?? null,
    compareAfter: request.compareAfter ?? null,
    notes: request.notes ?? null,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function stableId(seed: string, suffix: string): string {
  return `prism-${seed.slice(0, 12)}-${suffix}`;
}

function categoryScoresFromMetadata(
  metadataList: UiUxRouteMetadata[],
  componentMeta: UiUxComponentMetadata | undefined,
  mode: UiUxAuditMode,
): Omit<UiUxScorecard, "overall" | "weights"> {
  let usability = 85;
  let accessibility = 85;
  let responsive = 85;
  let visualHierarchy = 85;
  let designSystem = 85;
  let conversion = 85;
  let feedbackStates = 85;
  let performance = 85;

  for (const meta of metadataList) {
    if (meta.touchTargetMinPx !== undefined && meta.touchTargetMinPx < 44) responsive -= 15;
    if (meta.horizontalScrollRequired) responsive -= 12;
    if (meta.labelAssociated === false) accessibility -= 18;
    if (meta.focusVisible === false) accessibility -= 10;
    if (meta.contrastRatio !== undefined && meta.contrastRatio < 4.5) accessibility -= 15;
    if (meta.ctaCount !== undefined && meta.ctaCount > 3) {
      visualHierarchy -= 8;
      conversion -= 6;
    }
    if (meta.stepCount !== undefined && meta.stepCount > 2 && !meta.title) usability -= 8;
    if (meta.formFieldCount !== undefined && meta.formFieldCount > 8) usability -= 5;
    if (meta.hasEmptyState === false) feedbackStates -= 10;
    if (meta.hasErrorState === false && (meta.formFieldCount ?? 0) > 0) feedbackStates -= 8;
    if (meta.hasLoadingState === false && (meta.formFieldCount ?? 0) > 0) feedbackStates -= 5;
    if (!meta.usesOpPanel || !meta.usesOpAccent) designSystem -= 6;
  }

  if (componentMeta) {
    if (!componentMeta.usesOpPanel) designSystem -= 10;
    if (!componentMeta.usesOpAccent) designSystem -= 8;
    if (!componentMeta.usesMonospace) designSystem -= 5;
  }

  if (mode === "ACCESSIBILITY_CHECK") {
    accessibility = Math.min(accessibility, 75);
  }
  if (mode === "CONVERSION_REVIEW") {
    conversion = Math.min(conversion, 70);
  }
  if (mode === "DESIGN_SYSTEM_CHECK") {
    designSystem = Math.min(designSystem, 72);
  }

  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  return {
    usability: clamp(usability),
    accessibility: clamp(accessibility),
    responsive: clamp(responsive),
    visualHierarchy: clamp(visualHierarchy),
    designSystem: clamp(designSystem),
    conversion: clamp(conversion),
    feedbackStates: clamp(feedbackStates),
    performance: clamp(performance),
  };
}

export function buildScorecard(categoryValues: Omit<UiUxScorecard, "overall" | "weights">): UiUxScorecard {
  const overall = Math.round(
    (categoryValues.usability * SCORE_WEIGHTS.usability +
      categoryValues.accessibility * SCORE_WEIGHTS.accessibility +
      categoryValues.responsive * SCORE_WEIGHTS.responsive +
      categoryValues.visualHierarchy * SCORE_WEIGHTS.visualHierarchy +
      categoryValues.designSystem * SCORE_WEIGHTS.designSystem +
      categoryValues.conversion * SCORE_WEIGHTS.conversion +
      categoryValues.feedbackStates * SCORE_WEIGHTS.feedbackStates +
      categoryValues.performance * SCORE_WEIGHTS.performance) /
      100,
  );
  return {
    ...categoryValues,
    overall,
    weights: { ...SCORE_WEIGHTS },
  };
}

export function deriveReleaseRecommendation(
  scorecard: UiUxScorecard,
  findings: UiUxFinding[],
): UiUxReleaseRecommendation {
  const hasCritical = findings.some((f) => f.severity === "critical");
  const hasHigh = findings.some((f) => f.severity === "high");
  if (hasCritical || scorecard.overall < 50) return "BLOCK_RELEASE";
  if (hasHigh || scorecard.overall < 70) return "CHANGES_REQUIRED";
  if (scorecard.overall < 85) return "PASS_WITH_ADVISORIES";
  return "PASS";
}

function buildEvidence(type: UiUxEvidence["type"], source: string, summary: string, detail?: string): UiUxEvidence {
  return { type, source, summary, detail, capturedAt: new Date().toISOString() };
}

function findingFromFixture(
  auditId: string,
  viewport: UiUxViewport,
  fixtureRoute: string,
  index: number,
  hashSeed: string,
): UiUxFinding | null {
  const fixture = getFixtureForRoute(fixtureRoute);
  if (!fixture) return null;
  const sf = fixture.seededFinding;
  return {
    id: stableId(hashSeed, `f${index}`),
    auditId,
    route: fixture.route,
    viewport,
    category: sf.category,
    severity: sf.severity,
    evidence: [
      buildEvidence("fixture", fixture.route, `Fixture ${PRISM_FIXTURE_VERSION} metadata for ${fixture.route}`, sf.recommendation),
    ],
    userImpact: sf.userImpact,
    recommendation: sf.recommendation,
    implementationHint: sf.implementationHint,
    acceptanceCriteria: sf.acceptanceCriteria,
    confidence: 0.85,
    status: "open",
  };
}

function checklistFindings(
  auditId: string,
  request: UiUxAuditRequest,
  metadataList: UiUxRouteMetadata[],
  hashSeed: string,
): UiUxFinding[] {
  const findings: UiUxFinding[] = [];
  let idx = 0;

  for (const meta of metadataList) {
    if (meta.touchTargetMinPx !== undefined && meta.touchTargetMinPx < 44) {
      findings.push({
        id: stableId(hashSeed, `c${idx++}`),
        auditId,
        route: meta.route,
        viewport: request.viewport,
        category: "responsive",
        severity: request.viewport === "mobile" || request.viewport === "all" ? "high" : "medium",
        evidence: [buildEvidence("checklist", meta.route, `Touch target ${meta.touchTargetMinPx}px below 44px minimum`)],
        userImpact: "Users on touch devices may mis-tap controls.",
        recommendation: "Increase interactive target size to at least 44x44px.",
        implementationHint: "Apply min-h-11 min-w-11 Tailwind utilities to nav and button controls.",
        acceptanceCriteria: ["All primary controls meet 44px minimum on target viewport."],
        confidence: 0.9,
        status: "open",
      });
    }
    if (meta.labelAssociated === false) {
      findings.push({
        id: stableId(hashSeed, `c${idx++}`),
        auditId,
        route: meta.route,
        viewport: request.viewport,
        category: "accessibility",
        severity: "high",
        evidence: [buildEvidence("checklist", meta.route, "Form labels not programmatically associated")],
        userImpact: "Assistive technology users cannot identify field purpose.",
        recommendation: "Associate labels with inputs using htmlFor and id.",
        acceptanceCriteria: ["Every form field has an associated label."],
        confidence: 0.88,
        status: "open",
      });
    }
    if (meta.horizontalScrollRequired && (request.viewport === "mobile" || request.viewport === "tablet" || request.viewport === "all")) {
      findings.push({
        id: stableId(hashSeed, `c${idx++}`),
        auditId,
        route: meta.route,
        viewport: request.viewport,
        category: "responsive",
        severity: "medium",
        evidence: [buildEvidence("checklist", meta.route, "Horizontal scroll required on narrow viewport")],
        userImpact: "Content extends beyond viewport width on mobile/tablet.",
        recommendation: "Reflow tables and dense panels for narrow viewports.",
        acceptanceCriteria: ["No mandatory horizontal scroll at 375px width."],
        confidence: 0.82,
        status: "open",
      });
    }
  }

  if (request.mode === "COMPARE_STATES" && request.compareBefore && request.compareAfter) {
    const before = request.compareBefore as UiUxRouteMetadata;
    const after = request.compareAfter as UiUxRouteMetadata;
    if ((before.touchTargetMinPx ?? 44) > (after.touchTargetMinPx ?? 44)) {
      findings.push({
        id: stableId(hashSeed, `c${idx++}`),
        auditId,
        route: after.route,
        viewport: request.viewport,
        category: "responsive",
        severity: "high",
        evidence: [buildEvidence("metadata", "compare", "Touch targets regressed in after state")],
        userImpact: "Recent changes reduced tap target sizes.",
        recommendation: "Restore minimum 44px touch targets from the before state.",
        acceptanceCriteria: ["After state touch targets match or exceed before state."],
        confidence: 0.8,
        status: "open",
      });
    }
  }

  if (request.interactionResults) {
    for (const interaction of request.interactionResults) {
      if (!interaction.success) {
        findings.push({
          id: stableId(hashSeed, `c${idx++}`),
          auditId,
          viewport: request.viewport,
          category: "usability",
          severity: "medium",
          evidence: [buildEvidence("interaction", interaction.action, interaction.errorMessage ?? "Interaction failed")],
          userImpact: "Reported user interaction did not complete successfully.",
          recommendation: "Investigate failed interaction path and improve error feedback.",
          acceptanceCriteria: ["Interaction completes with clear success or recoverable error state."],
          confidence: 0.75,
          status: "open",
        });
      }
    }
  }

  return findings.slice(0, MAX_FINDINGS);
}

function buildPatchProposals(auditId: string, findings: UiUxFinding[], hashSeed: string): UiUxPatchProposal[] {
  return findings
    .filter((f) => f.implementationHint)
    .slice(0, 5)
    .map((f, i) => ({
      id: stableId(hashSeed, `p${i}`),
      auditId,
      findingId: f.id,
      filePath: f.route ? `src/pages${f.route === "/" ? "/EcosystemSplash" : f.route}.tsx` : "src/components/OperatorShell.tsx",
      description: f.recommendation,
      diffPreview: `// Advisory patch preview — requires operator approval\n// ${f.implementationHint}`,
      advisoryOnly: true as const,
      requiresOperatorApproval: true as const,
    }));
}

export async function generateUiUxAudit(request: UiUxAuditRequest, auditId?: string): Promise<UiUxAudit> {
  const resolvedId = auditId ?? crypto.randomUUID();
  const evidenceHash = await computeEvidenceHash(request);
  const hashSeed = evidenceHash;

  const routes = request.routes ?? [];
  let metadataList = request.routeMetadata ?? [];
  if (request.useFixture || metadataList.length === 0) {
    const fixtureMeta = resolveFixtureMetadata(routes.length > 0 ? routes : ["/"]);
    if (fixtureMeta.length > 0) {
      metadataList = fixtureMeta;
    }
  }

  const categoryValues = categoryScoresFromMetadata(metadataList, request.componentMetadata, request.mode);
  const scorecard = buildScorecard(categoryValues);

  const findings: UiUxFinding[] = [];
  const routesToSeed = routes.length > 0 ? routes : ["/"];
  for (let i = 0; i < routesToSeed.length; i++) {
    const fixtureFinding = findingFromFixture(resolvedId, request.viewport, routesToSeed[i], i, hashSeed);
    if (fixtureFinding) findings.push(fixtureFinding);
  }
  findings.push(...checklistFindings(resolvedId, request, metadataList, hashSeed));

  const uniqueFindings = dedupeFindings(findings).slice(0, MAX_FINDINGS);
  const releaseRecommendation = deriveReleaseRecommendation(scorecard, uniqueFindings);

  const now = new Date().toISOString();
  const auditBase: Omit<UiUxAudit, "councilEnvelope"> = {
    auditId: resolvedId,
    agentId: PRISM_UIUX_AGENT_ID,
    advisoryOnly: true,
    mode: request.mode,
    routes,
    component: request.component,
    viewport: request.viewport,
    request,
    scorecard,
    releaseRecommendation,
    findings: uniqueFindings,
    approvals: [],
    evidenceHash,
    createdAt: now,
    updatedAt: now,
  };

  if (request.mode === "PATCH_PROPOSAL") {
    auditBase.patchProposals = buildPatchProposals(resolvedId, uniqueFindings, hashSeed);
  }

  const councilEnvelope = buildPrismCouncilEnvelope(auditBase);

  return { ...auditBase, councilEnvelope };
}

function dedupeFindings(findings: UiUxFinding[]): UiUxFinding[] {
  const seen = new Set<string>();
  const result: UiUxFinding[] = [];
  for (const f of findings) {
    const key = `${f.route ?? ""}:${f.category}:${f.recommendation}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(f);
  }
  return result;
}

export function countFindingsBySeverity(findings: UiUxFinding[]): Record<UiUxFindingSeverity, number> {
  return {
    critical: findings.filter((f) => f.severity === "critical").length,
    high: findings.filter((f) => f.severity === "high").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    low: findings.filter((f) => f.severity === "low").length,
    info: findings.filter((f) => f.severity === "info").length,
  };
}

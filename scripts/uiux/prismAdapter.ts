import type { PrismBrowserEvidence, PrismCaptureManifest } from "./types.ts";
import type { UiUxAuditMode, UiUxAuditRequest, UiUxRouteMetadata, UiUxViewport } from "../../worker/data/prismUiuxTypes.ts";

export class PrismAdapterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrismAdapterError";
  }
}

function mapViewport(manifest: PrismCaptureManifest): UiUxViewport {
  if (manifest.viewports.length === 1) return manifest.viewports[0] as UiUxViewport;
  return "all";
}

function mergeRouteMetadata(evidence: PrismBrowserEvidence[]): UiUxRouteMetadata[] {
  const byRoute = new Map<string, UiUxRouteMetadata>();

  for (const item of evidence) {
    const existing = byRoute.get(item.route) ?? { route: item.route };
    const violationCount = item.accessibilityViolations.length;
    const serious = item.accessibilityViolations.filter((v) => v.impact === "critical" || v.impact === "serious").length;

    byRoute.set(item.route, {
      ...existing,
      route: item.route,
      title: item.pageTitle,
      horizontalScrollRequired: item.horizontalOverflow || existing.horizontalScrollRequired,
      hasLoadingState: item.hasLoadingIndicator || existing.hasLoadingState,
      hasEmptyState: item.hasEmptyStateText || existing.hasEmptyState,
      labelAssociated: serious === 0 ? true : false,
      focusVisible: item.focusOrder.some((f) => f !== "body"),
      ctaCount: item.linkCount,
      formFieldCount: item.interactiveElementCount,
      accessibilityViolationCount: (existing.accessibilityViolationCount ?? 0) + violationCount,
      landmarkCount: item.landmarks.length,
      headingOutline: item.headingOutline,
      consoleErrorCount: (existing.consoleErrorCount ?? 0) + item.consoleErrors.length,
      failedRequestCount: (existing.failedRequestCount ?? 0) + item.failedRequests.length,
      touchTargetMinPx: item.viewport.name === "mobile" ? 40 : 44,
    });
  }

  return [...byRoute.values()];
}

export function manifestToAuditRequest(
  manifest: PrismCaptureManifest,
  mode: UiUxAuditMode = "ACCESSIBILITY_CHECK",
): UiUxAuditRequest {
  if (!manifest.evidence.length) {
    throw new PrismAdapterError("Capture manifest contains no route evidence");
  }

  const routeMetadata = mergeRouteMetadata(manifest.evidence);
  const interactionResults = manifest.evidence.flatMap((item) => item.interactions);
  const screenshotRefs = manifest.evidence.map((item) => item.screenshot.ref);

  return {
    mode,
    routes: manifest.routes,
    viewport: mapViewport(manifest),
    useFixture: false,
    useLiveEvidence: true,
    captureId: manifest.captureId,
    idempotencyKey: manifest.idempotencyKey,
    routeMetadata,
    interactionResults,
    screenshotRefs,
    notes: `Live browser capture ${manifest.captureId} (${manifest.originClass})`,
  };
}

export function validateManifest(manifest: PrismCaptureManifest): void {
  if (!manifest.captureId) throw new PrismAdapterError("Missing captureId");
  if (!manifest.idempotencyKey) throw new PrismAdapterError("Missing idempotencyKey");
  if (!Array.isArray(manifest.routes) || manifest.routes.length === 0) {
    throw new PrismAdapterError("Manifest routes missing");
  }
}

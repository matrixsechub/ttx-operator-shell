import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Page, Response } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type {
  PrismBrowserEvidence,
  PrismCaptureFailure,
  PrismOriginClass,
  PrismViewportEvidence,
} from "./types.ts";
import { evidenceHash, routeHash } from "./hash.ts";
import { redactSensitiveText } from "./redact.ts";
import { buildRouteUrl, previewHtmlPath, validateRedirectChain, type ApprovedTarget } from "./targetPolicy.ts";
import { MAX_FOCUS_STEPS, type CaptureViewportName } from "./routes.ts";
import { emitTelemetry } from "./telemetry.ts";

export type CaptureRouteOptions = {
  captureId: string;
  route: string;
  target: ApprovedTarget;
  viewport: CaptureViewportName;
  viewportEvidence: PrismViewportEvidence;
  artifactDir: string;
  dryRun: boolean;
  requireAuth: boolean;
  maskSensitive: boolean;
};

function mapAxeImpact(impact: string | null | undefined): PrismBrowserEvidence["accessibilityViolations"][number]["impact"] {
  switch (impact) {
    case "critical":
    case "serious":
    case "moderate":
    case "minor":
      return impact;
    default:
      return "unknown";
  }
}

async function extractDomSignals(page: Page) {
  return page.evaluate(() => {
    const landmarks = Array.from(document.querySelectorAll("main, nav, header, footer, aside, [role='main'], [role='navigation']"))
      .map((el) => el.tagName.toLowerCase() + (el.getAttribute("role") ? `[role=${el.getAttribute("role")}]` : ""));
    const headingOutline = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"))
      .map((el) => `${el.tagName.toLowerCase()}: ${(el.textContent ?? "").trim().slice(0, 120)}`)
      .filter((line) => line.length > 3);
    const interactiveElementCount = document.querySelectorAll(
      "a,button,input,select,textarea,[tabindex]:not([tabindex='-1'])",
    ).length;
    const linkCount = document.querySelectorAll("a[href]").length;
    const horizontalOverflow = document.documentElement.scrollWidth > window.innerWidth + 1;
    const bodyText = document.body?.innerText ?? "";
    const hasLoadingIndicator = /loading|syncing|please wait/i.test(bodyText);
    const hasEmptyStateText = /no (data|results|records)|empty|nothing to show/i.test(bodyText);
    const hasMainLandmark = landmarks.some((l) => l.startsWith("main") || l.includes("role=main"));
    return {
      landmarks,
      headingOutline,
      interactiveElementCount,
      linkCount,
      horizontalOverflow,
      hasLoadingIndicator,
      hasEmptyStateText,
      hasMainLandmark,
    };
  });
}

async function captureFocusOrder(page: Page): Promise<string[]> {
  const order: string[] = [];
  for (let i = 0; i < MAX_FOCUS_STEPS; i++) {
    await page.keyboard.press("Tab");
    const active = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return "body";
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : "";
      const name = (el as HTMLElement).innerText?.trim().slice(0, 40) ?? "";
      return `${tag}${id}${name ? `:${name}` : ""}`;
    });
    order.push(active);
    if (order.filter((v) => v === active).length > 2) break;
  }
  return order;
}

export async function captureRoute(page: Page, options: CaptureRouteOptions): Promise<PrismBrowserEvidence | PrismCaptureFailure> {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const routeHashValue = await routeHash(options.route);

  emitTelemetry({
    event: "prism_capture_route_started",
    captureId: options.captureId,
    route: options.route,
    routeHash: routeHashValue,
    viewport: options.viewport,
    timestamp: startedAt,
  });

  const consoleErrors: PrismBrowserEvidence["consoleErrors"] = [];
  const pageErrors: string[] = [];
  const failedRequests: PrismBrowserEvidence["failedRequests"] = [];
  const interactions: PrismBrowserEvidence["interactions"] = [];
  const redirectChain: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push({ type: "error", message: redactSensitiveText(msg.text()), location: msg.location().url });
    }
  });
  page.on("pageerror", (err) => {
    pageErrors.push(redactSensitiveText(err.message));
  });
  page.on("requestfailed", (req) => {
    failedRequests.push({
      url: redactSensitiveText(req.url()),
      method: req.method(),
      failureText: redactSensitiveText(req.failure()?.errorText ?? "request failed"),
    });
  });
  page.on("response", (response: Response) => {
    const url = response.url();
    if (url.startsWith(options.target.origin)) {
      redirectChain.push(url);
    }
  });

  try {
    let url = buildRouteUrl(options.target.origin, options.route);
    if (options.target.originClass === "local_preview") {
      url = buildRouteUrl(options.target.origin, previewHtmlPath(options.route));
    }

    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    validateRedirectChain(options.target.origin, redirectChain);

    if (options.route.startsWith("/operator/") && options.target.originClass === "local_preview") {
      await page.evaluate((route) => {
        window.history.pushState({}, "", route);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }, options.route);
      await page.waitForTimeout(500);
    }

    if (options.requireAuth) {
      const bodyText = await page.locator("body").innerText();
      if (/login|sign in|operator auth/i.test(bodyText) && !/PRISM|UI\/UX Expert/i.test(bodyText)) {
        throw new Error("Operator route rendered unauthenticated content");
      }
    }

    await page.waitForTimeout(300);
    const dom = await extractDomSignals(page);

    const focusStarted = Date.now();
    const focusOrder = await captureFocusOrder(page);
    interactions.push({
      action: "keyboard_tab_traversal",
      success: focusOrder.length > 0,
      durationMs: Date.now() - focusStarted,
    });

    const axeResults = await new AxeBuilder({ page }).analyze();
    emitTelemetry({
      event: "prism_accessibility_scan_completed",
      captureId: options.captureId,
      route: options.route,
      viewport: options.viewport,
      violationCount: axeResults.violations.length,
      timestamp: new Date().toISOString(),
    });

    const accessibilityViolations = axeResults.violations.map((v) => ({
      id: v.id,
      impact: mapAxeImpact(v.impact),
      ruleId: v.id,
      description: v.description,
      help: v.help,
      nodes: v.nodes.length,
    }));

    const screenshotDir = join(options.artifactDir, "screenshots");
    mkdirSync(screenshotDir, { recursive: true });
    const screenshotFile = `${routeHashValue}-${options.viewport}.png`;
    const screenshotPath = join(screenshotDir, screenshotFile);

    if (!options.dryRun) {
      await page.screenshot({
        path: screenshotPath,
        fullPage: false,
        clip: { x: 0, y: 0, width: options.viewportEvidence.width, height: Math.min(options.viewportEvidence.height, 900) },
      });
    }

    const completedAt = new Date().toISOString();
    const evidence: Omit<PrismBrowserEvidence, "evidenceHash"> = {
      captureId: options.captureId,
      route: options.route,
      originClass: options.target.originClass,
      origin: options.target.origin,
      viewport: options.viewportEvidence,
      startedAt,
      completedAt,
      durationMs: Date.now() - startMs,
      browser: "chromium",
      pageTitle: await page.title(),
      finalUrl: page.url(),
      httpStatus: response?.status(),
      redirectChain: [...new Set(redirectChain.map((u) => redactSensitiveText(u)))],
      consoleErrors,
      pageErrors,
      failedRequests,
      accessibilityViolations,
      landmarks: dom.landmarks,
      headingOutline: dom.headingOutline,
      interactiveElementCount: dom.interactiveElementCount,
      linkCount: dom.linkCount,
      focusOrder,
      horizontalOverflow: dom.horizontalOverflow,
      hasMainLandmark: dom.hasMainLandmark,
      hasLoadingIndicator: dom.hasLoadingIndicator,
      hasEmptyStateText: dom.hasEmptyStateText,
      screenshot: {
        ref: `artifacts/uiux/${options.captureId}/screenshots/${screenshotFile}`,
        viewport: options.viewport,
        clipped: true,
        masked: options.maskSensitive,
      },
      interactions,
      status: "complete",
    };

    const hash = evidenceHash(evidence);
    const result: PrismBrowserEvidence = { ...evidence, evidenceHash: hash };

    emitTelemetry({
      event: "prism_capture_route_completed",
      captureId: options.captureId,
      route: options.route,
      routeHash: routeHashValue,
      viewport: options.viewport,
      durationMs: result.durationMs,
      violationCount: accessibilityViolations.length,
      consoleErrorCount: consoleErrors.length,
      failedRequestCount: failedRequests.length,
      status: result.status,
      evidenceHash: hash,
      timestamp: completedAt,
    });

    return result;
  } catch (err) {
    const completedAt = new Date().toISOString();
    const message = redactSensitiveText(err instanceof Error ? err.message : String(err));
    emitTelemetry({
      event: "prism_capture_route_failed",
      captureId: options.captureId,
      route: options.route,
      routeHash: routeHashValue,
      viewport: options.viewport,
      status: "failed",
      timestamp: completedAt,
    });
    return {
      route: options.route,
      viewport: options.viewport,
      message,
      startedAt,
      completedAt,
    };
  }
}

export function writeFailureArtifact(artifactDir: string, failure: PrismCaptureFailure): void {
  writeFileSync(join(artifactDir, "failure.json"), JSON.stringify(failure, null, 2));
}

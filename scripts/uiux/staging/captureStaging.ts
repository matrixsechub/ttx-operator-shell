import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type BrowserContext } from "@playwright/test";
import { captureRoute } from "../captureRoute.ts";
import { applyOperatorAuthToContext } from "../authBootstrap.ts";
import { PUBLIC_CAPTURE_ROUTES, OPERATOR_CAPTURE_ROUTES, VIEWPORT_PRESETS, type CaptureViewportName } from "../routes.ts";
import { evidenceHash, idempotencyKey } from "../hash.ts";
import { buildGovernanceEnvelope, emitTelemetry } from "../telemetry.ts";
import { redactObject } from "../redact.ts";
import type { PrismCaptureManifest, PrismViewportEvidence } from "../types.ts";
import { resolveStagingTarget, validateStagingRedirectChain } from "./targetPolicy.ts";
import { bootstrapEdgeApiToken } from "./edgeAuth.ts";
import { emitStagingTelemetry } from "./telemetry.ts";
import { isPerformanceProbeEnabled, runPerformanceProbe } from "./performanceProbe.ts";
import type { PrismPerformanceProbeResult } from "./types.ts";

export type StagingCaptureOptions = {
  scope: "public" | "operator";
  viewports?: CaptureViewportName[];
  artifactDir: string;
  captureId: string;
  dryRun?: boolean;
};

function viewportEvidence(name: CaptureViewportName): PrismViewportEvidence {
  const preset = VIEWPORT_PRESETS[name];
  return {
    name,
    width: preset.width,
    height: preset.height,
    deviceScaleFactor: preset.deviceScaleFactor,
    colorScheme: "dark",
    reducedMotion: true,
  };
}

export type StagingCaptureResult = {
  manifest: PrismCaptureManifest;
  bodyTextByRoute: Map<string, string>;
  edgeToken?: string;
  performanceProbes?: PrismPerformanceProbeResult[];
};

export async function runStagingCapture(options: StagingCaptureOptions): Promise<StagingCaptureResult> {
  const target = resolveStagingTarget();
  const routes = options.scope === "operator" ? [...OPERATOR_CAPTURE_ROUTES] : [...PUBLIC_CAPTURE_ROUTES];
  const viewports = options.viewports ?? (options.scope === "operator" ? ["mobile", "desktop"] : ["mobile"]);
  const startedAt = new Date().toISOString();
  const bodyTextByRoute = new Map<string, string>();

  mkdirSync(options.artifactDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  let context: BrowserContext | null = null;
  let edgeToken: string | undefined;
  const evidence: PrismCaptureManifest["evidence"] = [];
  const failures: PrismCaptureManifest["failures"] = [];
  const performanceProbes: PrismPerformanceProbeResult[] = [];

  try {
    context = await browser.newContext({
      reducedMotion: "reduce",
      colorScheme: "dark",
      ignoreHTTPSErrors: false,
    });

    if (options.scope === "operator") {
      const auth = await applyOperatorAuthToContext(context, target.origin);
      if (!auth.ok) throw new Error(auth.error);
      const edge = await bootstrapEdgeApiToken(target.origin);
      if (!edge.ok) throw new Error(edge.error);
      edgeToken = edge.token;

      const listResponse = await fetch(new URL("/api/operator/uiux/audits", target.origin), {
        headers: { Authorization: `Bearer ${edge.token}` },
      });
      if (!listResponse.ok) {
        throw new Error(`Authenticated PRISM audit index failed (${listResponse.status})`);
      }
    }

    for (const route of routes) {
      for (const viewportName of viewports) {
        const page = await context.newPage();
        await page.setViewportSize({
          width: VIEWPORT_PRESETS[viewportName].width,
          height: VIEWPORT_PRESETS[viewportName].height,
        });

        const result = await captureRoute(page, {
          captureId: options.captureId,
          route,
          target,
          viewport: viewportName,
          viewportEvidence: viewportEvidence(viewportName),
          artifactDir: options.artifactDir,
          dryRun: options.dryRun === true,
          requireAuth: options.scope === "operator",
          maskSensitive: options.scope === "operator",
        });

        if ("evidenceHash" in result) {
          validateStagingRedirectChain(target.origin, result.redirectChain);
          evidence.push(result);
          const bodyText = await page.locator("body").innerText().catch(() => result.pageTitle);
          bodyTextByRoute.set(route, bodyText);
          if (options.scope === "public" && isPerformanceProbeEnabled()) {
            performanceProbes.push(await runPerformanceProbe(page, route, viewportName));
          }
        } else {
          failures.push(result);
        }
        await page.close();
      }
    }
  } finally {
    if (context) {
      await context.clearCookies();
      await context.close();
    }
    await browser.close();
  }

  const completedAt = new Date().toISOString();
  const manifestEvidenceHash = evidenceHash({ evidence, failures, routes, viewports });
  const key = idempotencyKey({
    origin: target.origin,
    routes,
    viewports,
    mode: "ACCESSIBILITY_CHECK",
    evidenceHash: manifestEvidenceHash,
  });

  const governance = buildGovernanceEnvelope({
    captureId: options.captureId,
    actorType: process.env.CI ? "ci" : "local",
    targetOriginClass: "staging",
    routeScope: options.scope,
    requestedMode: "ACCESSIBILITY_CHECK",
    approvedRouteCount: routes.length,
    artifactRetentionClass: "staging_review",
    authenticationRequired: options.scope === "operator",
    productionTargetDenied: true,
    evidenceHash: manifestEvidenceHash,
    timestamp: completedAt,
  });

  const manifest: PrismCaptureManifest = {
    captureId: options.captureId,
    origin: target.origin,
    originClass: "staging",
    actorType: process.env.CI ? "ci" : "local",
    startedAt,
    completedAt,
    routes,
    viewports,
    browser: "chromium",
    dryRun: options.dryRun === true,
    authenticationRequired: options.scope === "operator",
    governance,
    evidence,
    failures,
    idempotencyKey: key,
    evidenceHash: manifestEvidenceHash,
    status: failures.length > 0 && evidence.length === 0 ? "failed" : failures.length > 0 ? "partial" : "complete",
  };

  const safeManifest = redactObject(manifest);
  writeFileSync(join(options.artifactDir, "manifest.json"), JSON.stringify(safeManifest, null, 2));
  writeFileSync(join(options.artifactDir, "evidence.json"), JSON.stringify(safeManifest.evidence, null, 2));

  emitTelemetry({
    event: "prism_evidence_generated",
    captureId: options.captureId,
    status: manifest.status,
    evidenceHash: manifest.evidenceHash,
    environment: "staging",
    timestamp: completedAt,
  });

  emitStagingTelemetry({
    event: "prism_staging_capture_completed",
    captureId: options.captureId,
    evidenceHash: manifest.evidenceHash,
    result: manifest.status,
    timestamp: completedAt,
  });

  return {
    manifest,
    bodyTextByRoute,
    edgeToken,
    performanceProbes: performanceProbes.length > 0 ? performanceProbes : undefined,
  };
}

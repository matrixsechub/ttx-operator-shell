import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Browser, type BrowserContext } from "@playwright/test";
import type { PrismCaptureManifest, PrismViewportEvidence } from "./types.ts";
import { applyOperatorAuthToContext } from "./authBootstrap.ts";
import { captureRoute } from "./captureRoute.ts";
import { evidenceHash, idempotencyKey } from "./hash.ts";
import { PUBLIC_CAPTURE_ROUTES, OPERATOR_CAPTURE_ROUTES, VIEWPORT_PRESETS, type CaptureViewportName } from "./routes.ts";
import { resolveApprovedTarget } from "./targetPolicy.ts";
import { emitTelemetry, buildGovernanceEnvelope } from "./telemetry.ts";
import { redactObject } from "./redact.ts";

export type CaptureEngineOptions = {
  origin: string;
  scope: "public" | "operator";
  viewports?: CaptureViewportName[];
  actorType?: "operator" | "ci" | "local";
  dryRun?: boolean;
  artifactRoot?: string;
  mode?: string;
  allowProductionPublic?: boolean;
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

export async function runCaptureEngine(options: CaptureEngineOptions): Promise<PrismCaptureManifest> {
  const captureId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const target = resolveApprovedTarget(options.origin, {
    allowProductionPublic: options.allowProductionPublic ?? process.env.PRISM_ALLOW_PRODUCTION_PUBLIC === "true",
  });
  const routes =
    options.scope === "operator" ? [...OPERATOR_CAPTURE_ROUTES] : [...PUBLIC_CAPTURE_ROUTES];
  const viewports =
    options.viewports ??
  (process.env.PRISM_CAPTURE_VIEWPORTS?.split(",").map((v) => v.trim()).filter(Boolean) as CaptureViewportName[] | undefined) ??
    ["mobile", "desktop"];
  const actorType = options.actorType ?? "local";
  const dryRun = options.dryRun === true;
  const artifactRoot = options.artifactRoot ?? join(process.cwd(), "artifacts", "uiux");
  const artifactDir = join(artifactRoot, captureId);
  mkdirSync(artifactDir, { recursive: true });

  emitTelemetry({
    event: "prism_capture_started",
    captureId,
    environment: target.originClass,
    timestamp: startedAt,
  });

  const browser: Browser = await chromium.launch({ headless: true });
  let context: BrowserContext | null = null;
  const evidence: PrismCaptureManifest["evidence"] = [];
  const failures: PrismCaptureManifest["failures"] = [];

  try {
    context = await browser.newContext({
      reducedMotion: "reduce",
      colorScheme: "dark",
      ignoreHTTPSErrors: true,
    });

    if (options.scope === "operator") {
      const auth = await applyOperatorAuthToContext(context, target.origin);
      if (!auth.ok) {
        throw new Error(auth.error);
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
          captureId,
          route,
          target,
          viewport: viewportName,
          viewportEvidence: viewportEvidence(viewportName),
          artifactDir,
          dryRun,
          requireAuth: options.scope === "operator",
          maskSensitive: options.scope === "operator",
        });

        if ("evidenceHash" in result) {
          evidence.push(result);
        } else {
          failures.push(result);
        }
        await page.close();
      }
    }
  } finally {
    if (context) await context.close();
    await browser.close();
  }

  const completedAt = new Date().toISOString();
  const manifestEvidenceHash = evidenceHash({ evidence, failures, routes, viewports });
  const key = idempotencyKey({
    origin: target.origin,
    routes,
    viewports,
    mode: options.mode ?? "AUDIT_ROUTE",
    evidenceHash: manifestEvidenceHash,
  });

  const governance = buildGovernanceEnvelope({
    captureId,
    actorType,
    targetOriginClass: target.originClass,
    routeScope: options.scope,
    requestedMode: options.mode ?? "AUDIT_ROUTE",
    approvedRouteCount: routes.length,
    artifactRetentionClass: actorType === "ci" ? "ephemeral_ci" : "local_dev",
    authenticationRequired: options.scope === "operator",
    productionTargetDenied: target.originClass !== "production_public",
    evidenceHash: manifestEvidenceHash,
    timestamp: completedAt,
  });

  const manifest: PrismCaptureManifest = {
    captureId,
    origin: target.origin,
    originClass: target.originClass,
    actorType,
    startedAt,
    completedAt,
    routes,
    viewports,
    browser: "chromium",
    dryRun,
    authenticationRequired: options.scope === "operator",
    governance,
    evidence,
    failures,
    idempotencyKey: key,
    evidenceHash: manifestEvidenceHash,
    status: failures.length > 0 && evidence.length === 0 ? "failed" : failures.length > 0 ? "partial" : "complete",
  };

  const safeManifest = redactObject(manifest);
  writeFileSync(join(artifactDir, "manifest.json"), JSON.stringify(safeManifest, null, 2));
  writeFileSync(join(artifactDir, "evidence.json"), JSON.stringify(safeManifest.evidence, null, 2));

  emitTelemetry({
    event: "prism_evidence_generated",
    captureId,
    status: manifest.status,
    evidenceHash: manifest.evidenceHash,
    environment: target.originClass,
    timestamp: completedAt,
  });

  return manifest;
}

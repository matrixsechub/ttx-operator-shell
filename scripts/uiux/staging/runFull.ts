import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PUBLIC_CAPTURE_ROUTES, OPERATOR_CAPTURE_ROUTES } from "../routes.ts";
import { evidenceHash } from "../hash.ts";
import { redactObject } from "../redact.ts";
import { runStagingPreflight } from "./preflight.ts";
import { runStagingCapture } from "./captureStaging.ts";
import { buildRouteTruthMatrix } from "./routeTruth.ts";
import { proveStagingSubmission } from "./submissionProof.ts";
import { analyzeFixtureDrift } from "./fixtureDrift.ts";
import { evaluateAdvisorySummary, evaluateInfrastructureFailures } from "./thresholds.ts";
import { buildStagingGovernance, assertGovernanceInvariants } from "./governance.ts";
import { scanArtifactDirectory } from "./verify.ts";
import { resolveStagingTarget } from "./targetPolicy.ts";
import { emitStagingTelemetry } from "./telemetry.ts";
import type { PrismStagingValidationResult } from "./types.ts";

export type StagingFullRunOptions = {
  runId?: string;
  skipSubmission?: boolean;
  dryRun?: boolean;
};

export async function runStagingValidation(options: StagingFullRunOptions = {}): Promise<PrismStagingValidationResult> {
  const runId = options.runId ?? crypto.randomUUID();
  const target = resolveStagingTarget();
  const artifactRoot = join(process.cwd(), "artifacts", "uiux", "staging", runId);
  mkdirSync(artifactRoot, { recursive: true });

  const preflight = await runStagingPreflight(target.origin);
  writeFileSync(join(artifactRoot, "preflight.json"), JSON.stringify(redactObject(preflight), null, 2));
  if (!preflight.passed) {
    throw new Error(`Staging preflight failed: ${preflight.failures.join("; ")}`);
  }

  const publicCaptureId = crypto.randomUUID();
  const publicDir = join(artifactRoot, "public-capture");
  const publicResult = await runStagingCapture({
    scope: "public",
    captureId: publicCaptureId,
    artifactDir: publicDir,
    dryRun: options.dryRun,
    viewports: ["mobile"],
  });

  if (publicResult.performanceProbes?.length) {
    writeFileSync(
      join(artifactRoot, "performance.json"),
      JSON.stringify(redactObject(publicResult.performanceProbes), null, 2),
    );
  }

  const operatorCaptureId = crypto.randomUUID();
  const operatorDir = join(artifactRoot, "operator-capture");
  const operatorResult = await runStagingCapture({
    scope: "operator",
    captureId: operatorCaptureId,
    artifactDir: operatorDir,
    dryRun: options.dryRun,
    viewports: ["mobile", "desktop"],
  });

  const combinedEvidence = [...publicResult.manifest.evidence, ...operatorResult.manifest.evidence];
  const combinedBodyText = new Map([...publicResult.bodyTextByRoute, ...operatorResult.bodyTextByRoute]);

  const routeTruth = buildRouteTruthMatrix(target.origin, combinedEvidence, combinedBodyText);
  writeFileSync(join(artifactRoot, "route-truth-matrix.json"), JSON.stringify(redactObject(routeTruth), null, 2));

  let submissionProof;
  if (!options.skipSubmission && publicResult.manifest.evidence.length > 0) {
    submissionProof = await proveStagingSubmission(
      target.origin,
      publicResult.manifest,
      artifactRoot,
      operatorResult.edgeToken,
    );
    writeFileSync(join(artifactRoot, "submission-proof.json"), JSON.stringify(redactObject(submissionProof), null, 2));
  }

  const fixtureDrift = analyzeFixtureDrift(target.origin, combinedEvidence);
  writeFileSync(join(artifactRoot, "fixture-drift.json"), JSON.stringify(redactObject(fixtureDrift), null, 2));

  const advisorySummary = evaluateAdvisorySummary(combinedEvidence);
  advisorySummary.infrastructureFailures = evaluateInfrastructureFailures({
    preflight,
    routeTruth,
    secretScanPassed: true,
    mutationAuthorized: false,
  });
  writeFileSync(join(artifactRoot, "advisory-summary.json"), JSON.stringify(redactObject(advisorySummary), null, 2));

  const secretScan = scanArtifactDirectory(artifactRoot);
  writeFileSync(join(artifactRoot, "verification.json"), JSON.stringify(redactObject(secretScan), null, 2));

  const governance = buildStagingGovernance({
    runId,
    captureId: publicCaptureId,
    canonicalOrigin: target.canonicalOrigin,
    routeScope: "mixed",
    publicRoutes: [...PUBLIC_CAPTURE_ROUTES],
    authenticatedRoutes: [...OPERATOR_CAPTURE_ROUTES],
    submittedAuditId: submissionProof?.auditId,
    fixtureDriftStatus: fixtureDrift.overallClassification,
  });
  assertGovernanceInvariants(governance);
  writeFileSync(join(artifactRoot, "governance.json"), JSON.stringify(redactObject(governance), null, 2));

  const infrastructureFailures = evaluateInfrastructureFailures({
    preflight,
    routeTruth,
    secretScanPassed: secretScan.ok,
    mutationAuthorized: governance.mutationAuthorized,
  });

  const passed =
    infrastructureFailures.length === 0 &&
    publicResult.manifest.status !== "failed" &&
    operatorResult.manifest.status !== "failed" &&
    routeTruth.passed &&
    secretScan.ok &&
    (options.skipSubmission || submissionProof?.passed === true);

  const result: PrismStagingValidationResult = {
    runId,
    captureId: publicCaptureId,
    origin: target.origin,
    preflight,
    publicManifest: publicResult.manifest,
    operatorManifest: operatorResult.manifest,
    routeTruth,
    submissionProof,
    fixtureDrift,
    advisorySummary,
    performance: publicResult.performanceProbes,
    governance,
    secretScanPassed: secretScan.ok,
    passed,
    completedAt: new Date().toISOString(),
  };

  writeFileSync(
    join(artifactRoot, "staging-validation-summary.json"),
    JSON.stringify(redactObject({ ...result, evidenceHash: evidenceHash(result) }), null, 2),
  );

  emitStagingTelemetry({
    event: passed ? "prism_staging_validation_completed" : "prism_staging_validation_failed",
    runId,
    captureId: publicCaptureId,
    evidenceHash: evidenceHash({ runId, passed }),
    timestamp: result.completedAt,
  });

  if (!passed) {
    throw new Error(`Staging validation failed: ${infrastructureFailures.join("; ")}`);
  }

  return result;
}


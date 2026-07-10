import type { PrismBrowserEvidence } from "../types.ts";
import type { PrismAdvisorySummary, PrismRouteTruthMatrix, PrismStagingPreflight } from "./types.ts";
import { evidenceHash } from "../hash.ts";
import { isInfrastructureRouteFailure } from "./routeTruth.ts";

export type ThresholdConfig = {
  criticalAxeViolations: number;
  seriousAxeViolations: number;
  horizontalOverflowRoutes: number;
  pageErrors: number;
  failedFirstPartyRequests: number;
  keyboardFocusFailures: number;
  prismOverallScore: number;
};

export const DEFAULT_ADVISORY_THRESHOLDS: ThresholdConfig = {
  criticalAxeViolations: 0,
  seriousAxeViolations: 3,
  horizontalOverflowRoutes: 2,
  pageErrors: 0,
  failedFirstPartyRequests: 3,
  keyboardFocusFailures: 2,
  prismOverallScore: 70,
};

export function evaluateInfrastructureFailures(input: {
  preflight: PrismStagingPreflight;
  routeTruth: PrismRouteTruthMatrix;
  secretScanPassed: boolean;
  mutationAuthorized?: boolean;
}): string[] {
  const failures: string[] = [];
  if (!input.preflight.passed) failures.push(...input.preflight.failures);
  if (!input.routeTruth.passed) {
    for (const row of input.routeTruth.rows) {
      if (isInfrastructureRouteFailure(row.validationResult)) {
        failures.push(`route ${row.route}: ${row.validationResult}`);
      }
    }
  }
  if (!input.secretScanPassed) failures.push("secret scan failed");
  if (input.mutationAuthorized === true) failures.push("mutationAuthorized invariant violated");
  return failures;
}

export function evaluateAdvisorySummary(
  evidence: PrismBrowserEvidence[],
  thresholds: ThresholdConfig = DEFAULT_ADVISORY_THRESHOLDS,
): PrismAdvisorySummary {
  const advisoryFlags: string[] = [];
  const thresholdBreaches: string[] = [];

  let criticalCount = 0;
  let seriousCount = 0;
  let overflowRoutes = 0;
  let pageErrors = 0;
  let failedRequests = 0;
  let focusFailures = 0;

  for (const item of evidence) {
    criticalCount += item.accessibilityViolations.filter((v) => v.impact === "critical").length;
    seriousCount += item.accessibilityViolations.filter((v) => v.impact === "serious").length;
    if (item.horizontalOverflow) overflowRoutes += 1;
    pageErrors += item.pageErrors.length;
    failedRequests += item.failedRequests.length;
    if (!item.interactions.some((i) => i.action === "keyboard_tab_traversal" && i.success)) {
      focusFailures += 1;
    }
  }

  if (criticalCount > thresholds.criticalAxeViolations) {
    thresholdBreaches.push(`critical axe violations: ${criticalCount}`);
    advisoryFlags.push("critical_accessibility");
  }
  if (seriousCount > thresholds.seriousAxeViolations) {
    thresholdBreaches.push(`serious axe violations: ${seriousCount}`);
    advisoryFlags.push("serious_accessibility");
  }
  if (overflowRoutes > thresholds.horizontalOverflowRoutes) {
    thresholdBreaches.push(`horizontal overflow routes: ${overflowRoutes}`);
    advisoryFlags.push("responsive_overflow");
  }
  if (pageErrors > thresholds.pageErrors) {
    thresholdBreaches.push(`page errors: ${pageErrors}`);
    advisoryFlags.push("runtime_errors");
  }
  if (failedRequests > thresholds.failedFirstPartyRequests) {
    thresholdBreaches.push(`failed requests: ${failedRequests}`);
    advisoryFlags.push("network_failures");
  }
  if (focusFailures > thresholds.keyboardFocusFailures) {
    thresholdBreaches.push(`keyboard focus failures: ${focusFailures}`);
    advisoryFlags.push("keyboard_focus");
  }

  let level: PrismAdvisorySummary["level"] = "pass";
  if (thresholdBreaches.length > 0) level = "advisory";
  if (criticalCount > 0 || seriousCount > 5) level = "changes_recommended";
  if (criticalCount > 2) level = "release_review_required";

  return {
    level,
    infrastructureFailures: [],
    advisoryFlags,
    thresholdBreaches,
    evidenceHash: evidenceHash({ advisoryFlags, thresholdBreaches, level }),
  };
}

import { PRISM_FIXTURE_VERSION, PRISM_ROUTE_FIXTURES } from "../../../worker/data/prismUiuxFixtures.ts";
import type { PrismBrowserEvidence } from "../types.ts";
import { evidenceHash } from "../hash.ts";
import type { PrismFixtureDriftClassification, PrismFixtureDriftReport, PrismFixtureDriftRow } from "./types.ts";
import { emitStagingTelemetry } from "./telemetry.ts";

function classifyRow(input: {
  fixtureRoute: string;
  liveAvailable: boolean;
  violationDelta: number;
  consoleErrors: number;
  fixtureSeverity: string;
}): PrismFixtureDriftClassification {
  if (!input.liveAvailable) return "inconclusive";
  if (input.violationDelta === 0 && input.consoleErrors === 0) return "none";
  if (input.fixtureSeverity === "high" && input.violationDelta > 0) return "expected";
  if (input.violationDelta > 2 || input.consoleErrors > 3) return "live_regression";
  if (input.violationDelta > 0) return "fixture_stale";
  return "inconclusive";
}

export function analyzeFixtureDrift(
  origin: string,
  evidence: PrismBrowserEvidence[],
): PrismFixtureDriftReport {
  const rows: PrismFixtureDriftRow[] = [];

  for (const fixture of PRISM_ROUTE_FIXTURES) {
    const liveItems = evidence.filter((e) => e.route === fixture.route);
    const primary = liveItems.find((e) => e.viewport.name === fixture.defaultViewport) ?? liveItems[0];
    const violationCount = primary?.accessibilityViolations.length ?? 0;
    const consoleErrorCount = primary?.consoleErrors.length ?? 0;
    const failedRequestCount = primary?.failedRequests.length ?? 0;

    const classification = classifyRow({
      fixtureRoute: fixture.route,
      liveAvailable: Boolean(primary),
      violationDelta: violationCount,
      consoleErrors: consoleErrorCount,
      fixtureSeverity: fixture.seededFinding.severity,
    });

    const staleFixtureFindings: string[] = [];
    const newlyObservedFindings: string[] = [];

    if (classification === "fixture_stale" || classification === "live_regression") {
      newlyObservedFindings.push(
        `${violationCount} axe violations, ${consoleErrorCount} console errors on ${fixture.route}`,
      );
    }
    if (classification === "none" && fixture.seededFinding.severity === "high") {
      staleFixtureFindings.push(fixture.seededFinding.recommendation);
    }

    rows.push({
      route: fixture.route,
      viewport: fixture.defaultViewport,
      classification,
      expectedFixtureFinding: `${fixture.seededFinding.category}/${fixture.seededFinding.severity}`,
      liveViolationCount: violationCount,
      consoleErrorCount,
      failedRequestCount,
      horizontalOverflow: primary?.horizontalOverflow ?? false,
      landmarkCount: primary?.landmarks.length ?? 0,
      headingCount: primary?.headingOutline.length ?? 0,
      staleFixtureFindings,
      newlyObservedFindings,
      notes:
        classification === "fixture_stale"
          ? ["Live evidence differs from seeded fixture — operator review required before fixture rewrite."]
          : [],
    });
  }

  const overallClassification: PrismFixtureDriftClassification = rows.some((r) => r.classification === "live_regression")
    ? "live_regression"
    : rows.some((r) => r.classification === "fixture_stale")
      ? "fixture_stale"
      : rows.every((r) => r.classification === "none")
        ? "none"
        : "inconclusive";

  const recommendedFixtureUpdates = rows
    .filter((r) => r.classification === "fixture_stale" || r.classification === "live_regression")
    .map(
      (r) =>
        `Advisory patch proposal for ${r.route}: review live capture and update fixture ${PRISM_FIXTURE_VERSION} after operator approval.`,
    );

  const report: PrismFixtureDriftReport = {
    fixtureVersion: PRISM_FIXTURE_VERSION,
    origin,
    rows,
    overallClassification,
    recommendedFixtureUpdates,
    evidenceHash: evidenceHash(rows),
  };

  emitStagingTelemetry({
    event: "prism_fixture_drift_completed",
    evidenceHash: report.evidenceHash,
    result: report.overallClassification,
    timestamp: new Date().toISOString(),
  });

  return report;
}

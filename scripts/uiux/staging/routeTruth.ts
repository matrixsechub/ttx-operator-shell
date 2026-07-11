import type { PrismBrowserEvidence } from "../types.ts";
import { evidenceHash } from "../hash.ts";
import type { PrismRouteTruthMatrix, PrismRouteTruthRow } from "./types.ts";
import {
  STAGING_OPERATOR_ROUTE_CONTRACT,
  STAGING_PUBLIC_ROUTE_CONTRACTS,
  classifyRouteValidation,
  observedSurfaceFromUrl,
  type RouteContract,
} from "./routeContracts.ts";
import { emitStagingTelemetry } from "./telemetry.ts";

function contractForRoute(route: string): RouteContract | undefined {
  if (route === STAGING_OPERATOR_ROUTE_CONTRACT.route) return STAGING_OPERATOR_ROUTE_CONTRACT;
  return STAGING_PUBLIC_ROUTE_CONTRACTS.find((c) => c.route === route);
}

export function buildRouteTruthRow(
  contract: RouteContract,
  evidence: PrismBrowserEvidence,
  bodyText: string,
): PrismRouteTruthRow {
  const searchableText = `${bodyText}\n${evidence.pageTitle}`;
  const loginRedirect = /login|sign in|operator auth/i.test(searchableText) && !/PRISM|UI\/UX Expert/i.test(searchableText);
  const validationResult = classifyRouteValidation({
    contract,
    bodyText: searchableText,
    finalUrl: evidence.finalUrl,
    requestedStatus: evidence.httpStatus,
    finalStatus: evidence.httpStatus,
    redirectCount: evidence.redirectChain.length,
    renderStatus: evidence.status === "complete" ? "complete" : "failed",
    loginRedirect,
  });

  return {
    route: contract.route,
    expectedSurface: contract.expectedSurface,
    observedSurface: observedSurfaceFromUrl(new URL(evidence.finalUrl).pathname),
    requestedStatus: evidence.httpStatus,
    finalStatus: evidence.httpStatus,
    finalUrl: evidence.finalUrl,
    redirectCount: evidence.redirectChain.length,
    markerMatched: contract.markers.some((m) => searchableText.includes(m)),
    renderStatus: evidence.status === "complete" ? "complete" : "failed",
    validationResult,
  };
}

export function buildRouteTruthMatrix(
  origin: string,
  evidenceItems: PrismBrowserEvidence[],
  bodyTextByRoute: Map<string, string>,
): PrismRouteTruthMatrix {
  const rows: PrismRouteTruthRow[] = [];

  for (const item of evidenceItems) {
    const contract = contractForRoute(item.route);
    if (!contract) continue;
    const bodyText = bodyTextByRoute.get(item.route) ?? item.pageTitle;
    const row = buildRouteTruthRow(contract, item, bodyText);
    rows.push(row);
    emitStagingTelemetry({
      event: "prism_staging_route_validated",
      routeHash: item.evidenceHash.slice(0, 16),
      result: row.validationResult,
      timestamp: new Date().toISOString(),
    });
  }

  const infrastructureFailures = rows.filter((r) => isInfrastructureRouteFailure(r.validationResult));

  const matrix: PrismRouteTruthMatrix = {
    origin,
    rows,
    evidenceHash: evidenceHash(rows),
    passed: infrastructureFailures.length === 0,
  };

  return matrix;
}

export function isInfrastructureRouteFailure(result: PrismRouteTruthRow["validationResult"]): boolean {
  switch (result) {
    case "pass":
    case "pass_with_warning":
      return false;
    case "route_mismatch":
    case "unauthorized_redirect":
    case "missing_surface_marker":
    case "unavailable":
    case "capture_failed":
      return true;
    default: {
      const never: never = result;
      return Boolean(never);
    }
  }
}

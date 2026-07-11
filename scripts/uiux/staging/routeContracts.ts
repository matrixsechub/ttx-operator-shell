import { resolveHtmlSurface } from "../../../worker/surfaceRegistry.ts";
import type { RouteValidationResult } from "./types.ts";

export type RouteContract = {
  route: string;
  expectedSurface: string;
  markers: string[];
  forbidLoginRedirect?: boolean;
};

export const STAGING_PUBLIC_ROUTE_CONTRACTS: RouteContract[] = [
  { route: "/", expectedSurface: "ecosystem", markers: ["Ecosystem", "Ecosystem Entry", "MSH OPS"] },
  { route: "/services", expectedSurface: "storefront", markers: ["MSH OPS", "Service"] },
  { route: "/enter", expectedSurface: "storefront", markers: ["Guided Intake", "MSHOPS"] },
  { route: "/register", expectedSurface: "storefront", markers: ["Registration", "Ecosystem"] },
  { route: "/intake", expectedSurface: "storefront", markers: ["Intake", "MSH OPS"] },
  { route: "/status", expectedSurface: "cockpit", markers: ["Public Status", "Status"] },
  {
    route: "/apps/automation-builder",
    expectedSurface: "storefront",
    markers: ["Automation", "Builder"],
  },
  {
    route: "/apps/security-fleet",
    expectedSurface: "storefront",
    markers: ["Security", "Fleet"],
  },
];

export const STAGING_OPERATOR_ROUTE_CONTRACT: RouteContract = {
  route: "/operator/uiux-expert",
  expectedSurface: "cockpit",
  markers: ["PRISM", "UI/UX Expert", "Operator Terminal"],
  forbidLoginRedirect: true,
};

export function observedSurfaceFromUrl(pathname: string): string {
  return resolveHtmlSurface(pathname);
}

export function classifyRouteValidation(input: {
  contract: RouteContract;
  bodyText: string;
  finalUrl: string;
  requestedStatus?: number;
  finalStatus?: number;
  redirectCount: number;
  renderStatus: "complete" | "failed";
  loginRedirect: boolean;
}): RouteValidationResult {
  if (input.renderStatus === "failed") return "capture_failed";
  if (input.finalStatus === 404 || input.finalStatus === 503) return "unavailable";
  if (input.loginRedirect && input.contract.forbidLoginRedirect) return "unauthorized_redirect";
  if (input.redirectCount > 0 && /\/login\b/i.test(input.finalUrl)) return "unauthorized_redirect";

  const markerMatched = input.contract.markers.some((m) => input.bodyText.includes(m));
  if (!markerMatched) return "missing_surface_marker";

  const observed = observedSurfaceFromUrl(new URL(input.finalUrl).pathname);
  if (observed !== input.contract.expectedSurface) {
    if (input.contract.route === "/" && observed === "storefront") return "pass_with_warning";
    return "route_mismatch";
  }

  return "pass";
}

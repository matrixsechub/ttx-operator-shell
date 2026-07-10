import type { PrismOriginClass } from "./types.ts";

export type ApprovedTarget = {
  origin: string;
  originClass: PrismOriginClass;
};

const DEFAULT_STAGING_ORIGIN = "https://ttx-operator-shell-staging.sogellagepul.workers.dev";
const DEFAULT_PRODUCTION_ORIGIN = "https://ttx-operator-shell.sogellagepul.workers.dev";

function normalizeOrigin(origin: string): string {
  const url = new URL(origin);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TargetPolicyError(`Unsupported protocol: ${url.protocol}`);
  }
  return `${url.protocol}//${url.host}`;
}

export class TargetPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TargetPolicyError";
  }
}

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function resolveApprovedTarget(rawOrigin: string, options: { allowProductionPublic?: boolean } = {}): ApprovedTarget {
  const origin = normalizeOrigin(rawOrigin);
  const url = new URL(origin);
  const stagingOrigin = normalizeOrigin(process.env.PRISM_STAGING_ORIGIN ?? DEFAULT_STAGING_ORIGIN);
  const productionOrigin = normalizeOrigin(process.env.PRISM_PRODUCTION_ORIGIN ?? DEFAULT_PRODUCTION_ORIGIN);

  if (isLocalHost(url.hostname)) {
    const port = url.port || (url.protocol === "https:" ? "443" : "80");
    const devPorts = new Set(["5173", "8787", "80"]);
    const previewPorts = new Set(["4173", "4175", "8788"]);
    if (devPorts.has(port) || url.port === "5173" || url.port === "8787") {
      return { origin, originClass: "local_dev" };
    }
    if (previewPorts.has(port) || url.port === "4173" || url.port === "4175") {
      return { origin, originClass: "local_preview" };
    }
    return { origin, originClass: "local_dev" };
  }

  if (origin === stagingOrigin) {
    return { origin, originClass: "staging" };
  }

  if (origin === productionOrigin) {
    if (!options.allowProductionPublic) {
      throw new TargetPolicyError("Production origin denied unless PRISM_ALLOW_PRODUCTION_PUBLIC=true");
    }
    return { origin, originClass: "production_public" };
  }

  throw new TargetPolicyError(`Origin not approved: ${origin}`);
}

export function buildRouteUrl(origin: string, route: string): string {
  const normalizedRoute = route.startsWith("/") ? route : `/${route}`;
  return new URL(normalizedRoute, origin).toString();
}

export function validateRedirectChain(origin: string, chain: string[]): void {
  const approved = normalizeOrigin(origin);
  for (const hop of chain) {
    if (!hop) continue;
    const hopOrigin = normalizeOrigin(new URL(hop).origin);
    if (hopOrigin !== approved) {
      throw new TargetPolicyError(`Redirect to unapproved origin: ${hopOrigin}`);
    }
  }
}

export function previewHtmlPath(route: string): string {
  if (route === "/") return "/ecosystem-shell.html";
  const map: Record<string, string> = {
    "/services": "/services.html",
    "/enter": "/enter.html",
    "/register": "/register.html",
    "/intake": "/intake.html",
    "/status": "/status.html",
    "/apps/automation-builder": "/automation-builder.html",
    "/apps/security-fleet": "/security-fleet.html",
    "/operator/uiux-expert": "/operator-shell.html",
  };
  return map[route] ?? route;
}

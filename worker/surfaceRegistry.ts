/** Architectural HTML surfaces — each maps to a distinct SPA shell. */
export type HtmlSurface = "ecosystem" | "storefront" | "cockpit" | "auth" | "governance";

const COCKPIT_PREFIXES = ["/ops", "/systems", "/dashboard", "/divisions", "/ttx", "/future", "/status", "/about", "/join"] as const;

const STOREFRONT_PATHS = ["/marketplace", "/enter", "/storefront"] as const;

export function resolveHtmlSurface(pathname: string): HtmlSurface {
  const normalized = pathname.replace(/\/$/, "") || "/";

  if (normalized === "/") return "ecosystem";
  // Track 5 structural rebuild: /onboarding is the live wizard on the
  // ecosystem surface (the static pager was retired from the route map).
  if (normalized === "/onboarding" || normalized.startsWith("/onboarding/")) return "ecosystem";
  if (normalized === "/login") return "auth";
  if (normalized === "/council" || normalized.startsWith("/council/")) return "governance";

  if (COCKPIT_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))) {
    return "cockpit";
  }

  if (
    STOREFRONT_PATHS.some((path) => normalized === path || normalized.startsWith(`${path}/`))
  ) {
    return "storefront";
  }

  return "storefront";
}

export function surfaceShellPath(surface: HtmlSurface): string {
  switch (surface) {
    case "ecosystem":
      return "/ecosystem-shell.html";
    case "storefront":
      return "/app/index.html";
    case "cockpit":
      return "/operator-shell.html";
    case "auth":
      return "/auth-shell.html";
    case "governance":
      return "/council-shell.html";
    default: {
      const never: never = surface;
      return never;
    }
  }
}

export function surfaceHeaderName(surface: HtmlSurface): string {
  switch (surface) {
    case "ecosystem":
      return "X-Ecosystem-Route";
    case "storefront":
      return "X-Surface-Route";
    case "cockpit":
      return "X-Operator-Route";
    case "auth":
      return "X-Auth-Route";
    case "governance":
      return "X-Governance-Route";
    default: {
      const never: never = surface;
      return never;
    }
  }
}

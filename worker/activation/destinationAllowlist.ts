const ALLOWED_DESTINATIONS = [
  "/",
  "/enter",
  "/marketplace",
  "/services",
  "/intake",
  "/ecosystem",
  "/catalog",
] as const;

export type AllowedDestination = (typeof ALLOWED_DESTINATIONS)[number];

export function isAllowedDestination(path: string): boolean {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = normalized.split("?")[0]?.split("#")[0] ?? normalized;
  return (ALLOWED_DESTINATIONS as readonly string[]).includes(base);
}

export function sanitizeDestination(path: string): AllowedDestination {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = (normalized.split("?")[0]?.split("#")[0] ?? "/") as AllowedDestination;
  if (isAllowedDestination(base)) return base;
  return "/";
}

export function listAllowedDestinations(): readonly string[] {
  return ALLOWED_DESTINATIONS;
}

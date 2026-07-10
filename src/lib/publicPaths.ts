/** HTML routes that must never require authentication. */
export const PUBLIC_PATHS = ["/", "/enter", "/login", "/marketplace", "/storefront", "/council"] as const;

export type PublicPath = (typeof PUBLIC_PATHS)[number];

export function isPublicPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return (PUBLIC_PATHS as readonly string[]).includes(normalized);
}

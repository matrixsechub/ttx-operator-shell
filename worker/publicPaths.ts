/** HTML routes that bypass edge auth and operator session gates. */
export const PUBLIC_PATHS = ["/", "/enter", "/login", "/marketplace", "/storefront", "/council"] as const;

export function isPublicPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return (PUBLIC_PATHS as readonly string[]).includes(normalized);
}

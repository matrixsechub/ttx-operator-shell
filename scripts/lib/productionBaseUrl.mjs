/**
 * Strict production base-URL validator for smoke entrypoints.
 * Mirrors scripts/lib/stagingBaseUrl.mjs. The allowlist is a compile-time
 * constant — never redefine it via environment variables, so a mistyped or
 * attacker-supplied PRODUCTION_BASE_URL cannot redirect smoke traffic.
 *
 * Hostname source: ORIGIN_URL in wrangler.jsonc (production vars).
 */

const ALLOWED_PRODUCTION_HOSTNAME = "ttx-operator-shell.sogellagepul.workers.dev";

/**
 * @param {unknown} raw
 * @returns {{ ok: true, baseUrl: string } | { ok: false, error: string }}
 */
export function validateProductionBaseUrl(raw) {
  if (raw == null || typeof raw !== "string" || !raw.trim()) {
    return { ok: false, error: "PRODUCTION_BASE_URL is required" };
  }

  let parsed;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return { ok: false, error: "PRODUCTION_BASE_URL must be a valid URL" };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, error: "PRODUCTION_BASE_URL must use HTTPS" };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: "PRODUCTION_BASE_URL must not include userinfo" };
  }
  if (parsed.port && parsed.port !== "443") {
    return { ok: false, error: "PRODUCTION_BASE_URL must not use unexpected ports" };
  }
  if (parsed.search || parsed.hash) {
    return { ok: false, error: "PRODUCTION_BASE_URL must not include query or fragment" };
  }
  if (parsed.hostname !== ALLOWED_PRODUCTION_HOSTNAME) {
    return { ok: false, error: "PRODUCTION_BASE_URL hostname is not allowlisted" };
  }
  const path = parsed.pathname === "" || parsed.pathname === "/" ? "" : parsed.pathname;
  if (path !== "") {
    return { ok: false, error: "PRODUCTION_BASE_URL must not include a path" };
  }

  return { ok: true, baseUrl: `https://${ALLOWED_PRODUCTION_HOSTNAME}` };
}

export { ALLOWED_PRODUCTION_HOSTNAME };

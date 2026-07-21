/**
 * Strict staging base-URL validator for smoke entrypoints.
 * Allowlist is a compile-time constant — never redefine via environment variables.
 */

const ALLOWED_STAGING_HOSTNAME = "ttx-operator-shell-staging.sogellagepul.workers.dev";

/**
 * @param {unknown} raw
 * @returns {{ ok: true, baseUrl: string } | { ok: false, error: string }}
 */
export function validateStagingBaseUrl(raw) {
  if (raw == null || typeof raw !== "string" || !raw.trim()) {
    return { ok: false, error: "STAGING_BASE_URL is required" };
  }

  let parsed;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return { ok: false, error: "STAGING_BASE_URL must be a valid URL" };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, error: "STAGING_BASE_URL must use HTTPS" };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, error: "STAGING_BASE_URL must not include userinfo" };
  }

  if (parsed.port && parsed.port !== "443") {
    return { ok: false, error: "STAGING_BASE_URL must not use unexpected ports" };
  }

  if (parsed.search || parsed.hash) {
    return { ok: false, error: "STAGING_BASE_URL must not include query or fragment" };
  }

  if (parsed.hostname !== ALLOWED_STAGING_HOSTNAME) {
    return { ok: false, error: "STAGING_BASE_URL hostname is not allowlisted" };
  }

  const path = parsed.pathname === "" || parsed.pathname === "/" ? "" : parsed.pathname;
  if (path !== "") {
    return { ok: false, error: "STAGING_BASE_URL must not include a path" };
  }

  return { ok: true, baseUrl: `https://${ALLOWED_STAGING_HOSTNAME}` };
}

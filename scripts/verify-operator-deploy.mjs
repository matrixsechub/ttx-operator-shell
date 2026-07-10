#!/usr/bin/env node
/**
 * Controlled Operator Beta deployment gate.
 * Rejects activation if any critical subsystem check fails.
 *
 * Usage:
 *   node scripts/verify-operator-deploy.mjs [baseUrl] [expectedCommitSha]
 *
 * When expectedCommitSha is provided, /api/build-info commitSha must match
 * (full SHA or short prefix).
 */
const base = process.argv[2] || "https://ttx-operator-shell.sogellagepul.workers.dev";
const expectedCommit = process.argv[3]?.trim() || null;
async function probeJson(path, init = {}) {
  const r = await fetch(`${base}${path}`, {
    redirect: "manual",
    headers: { "Cache-Control": "no-cache", Accept: "application/json" },
    ...init,
  });
  let json = null;
  try {
    json = await r.json();
  } catch {
    json = null;
  }
  return { path, status: r.status, location: r.headers.get("location"), headers: Object.fromEntries(r.headers), json };
}

async function probeHtml(path) {
  const r = await fetch(`${base}${path}`, {
    redirect: "manual",
    headers: { "Cache-Control": "no-cache" },
  });
  const text = r.status === 301 || r.status === 302 ? "" : await r.text();
  return {
    path,
    status: r.status,
    location: r.headers.get("location"),
    surface: r.headers.get("x-surface"),
    title: text.match(/<title>([^<]+)/)?.[1] ?? null,
    isEcosystem: text.includes("Ecosystem Entry"),
    isStorefront: text.includes("MSH OPS Storefront"),
    isAuth: text.includes("Operator Auth"),
  };
}

const root = await probeHtml("/");
const enter = await probeHtml("/enter");
const login = await probeHtml("/login");
const marketplace = await probeHtml("/marketplace");
const systems = await probeHtml("/systems");

const systemState = await probeJson("/api/system/state");
const telemetry = await probeJson("/api/telemetry/summary");
const ghost = await probeJson("/api/ghost/telemetry");
const opsApi = await probeJson("/api/ops/fedgrade");
const wildcardBlocked = await probeJson("/api/ttx/local-scenarios/import", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "beta-gate-test" }),
});
const autonomousBlocked = await probeJson("/api/lifecycle/advance/run", { method: "POST" });

const buildInfo = await probeJson("/api/build-info");
const protectedSecurity = await probeJson("/api/security/events");
const protectedTtx = await probeJson("/api/ttx/sessions/scenarios");
const protectedWebhooks = await probeJson("/api/webhooks/events");
const systemStatus = await probeJson("/api/system/status");

const buildCommit = buildInfo.json?.commitSha ?? "";
const commitMatches =
  !expectedCommit ||
  buildCommit === expectedCommit ||
  buildCommit.startsWith(expectedCommit) ||
  expectedCommit.startsWith(buildCommit);

const state = systemState.json?.state;
const checks = {
  routeRootEcosystem: root.surface === "ecosystem" || root.isEcosystem,
  routeEnterStorefront: enter.surface === "storefront" || enter.isStorefront,
  routeLoginAuth: login.surface === "auth" || login.isAuth,
  routeMarketplaceOk: marketplace.surface === "storefront" || marketplace.isStorefront,
  routeSystemsProtected: systems.status === 302 && systems.location?.includes("/login"),
  systemStateComplete:
    systemState.status === 200 &&
    Boolean(state?.governance?.northstar) &&
    Boolean(state?.governance?.mandateRegistry?.length) &&
    typeof state?.telemetry?.requestCount === "number" &&
    typeof state?.telemetry?.latencyP50Ms === "number" &&
    Array.isArray(state?.marketplace?.modules) &&
    state?.ghost?.connected === true &&
    Boolean(state?.policy),
  systemModeBeta: state?.systemMode === "OPERATOR_BETA",
  sessionApiBlocked: opsApi.status === 401 && opsApi.json?.code === "SESSION_REQUIRED",
  governanceWildcardBlocked: wildcardBlocked.status === 403 && wildcardBlocked.json?.code === "GOVERNANCE_WILDCARD_BLOCKED",
  betaAutonomousBlocked: autonomousBlocked.status === 403 && autonomousBlocked.json?.code === "BETA_AUTONOMOUS_BLOCKED",
  telemetryLive:
    telemetry.status === 200 &&
    typeof telemetry.json?.summary?.requestCount === "number" &&
    typeof telemetry.json?.summary?.sessionEvents === "number",
  ghostConnected: ghost.json?.connected === true,
  headerSystemMode: systemState.headers?.["x-system-mode"] === "OPERATOR_BETA",
  buildInfoPublic: buildInfo.status === 200 && typeof buildInfo.json?.commitSha === "string",
  buildInfoCommitMatches: commitMatches,
  protectedSecurityEvents: protectedSecurity.status === 401,
  protectedTtxScenarios: protectedTtx.status === 401,
  protectedWebhookEvents: protectedWebhooks.status === 401,
  systemStatusOk: systemStatus.status === 200 && Boolean(systemStatus.json?.harness || systemStatus.json?.api),
};
const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const health =
  failed.length === 0
    ? "STABLE"
    : failed.some((n) => n.includes("systemState") || n.includes("ghost"))
      ? "CRITICAL"
      : "DEGRADED";

const report = {
  base,
  deploymentStatus: failed.length === 0 ? "success" : "failed",
  systemMode: state?.systemMode ?? "NOT_SET",
  systemHealth: health,
  failedChecks: failed,
  routes: { root, enter, login, marketplace, systems },
  systemState: { status: systemState.status, systemMode: state?.systemMode, ghostConnected: state?.ghost?.connected },
  telemetry: telemetry.json?.summary,
  ghost: { connected: ghost.json?.connected, authMethod: ghost.json?.authMethod },
  sessionEnforcement: { systems: systems.status, opsApi: opsApi.status },
  governance: { wildcardBlocked: wildcardBlocked.status, autonomousBlocked: autonomousBlocked.status },
  buildInfo: { status: buildInfo.status, commitSha: buildCommit, expectedCommit, commitMatches },
  protectedApis: {
    securityEvents: protectedSecurity.status,
    ttxScenarios: protectedTtx.status,
    webhookEvents: protectedWebhooks.status,
  },
  systemStatus: { status: systemStatus.status },
  checks,
};
console.log(JSON.stringify(report, null, 2));
process.exit(failed.length === 0 ? 0 : 1);

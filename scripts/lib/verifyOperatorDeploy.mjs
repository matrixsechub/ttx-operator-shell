/** Shared deployment verification checks for operator-shell handoff and MSHOPS beta gates. */

export const HANDOFF_CHECK_NAMES = [
  "buildInfoPublic",
  "buildInfoCommitMatches",
  "xBuildCommitHeader",
  "engineHealthOk",
  "engineVersionOk",
  "engineVersionCommitMatches",
  "systemStatusOk",
  "systemModeMatchesDeployEnv",
  "protectedSecurityEvents",
  "protectedTtxScenarios",
  "protectedWebhookEvents",
  "routeRootEcosystem",
  "routeLoginAuth",
  "routeOperatorShellOk",
];

export const BETA_CHECK_NAMES = [
  "routeEnterStorefront",
  "routeMarketplaceOk",
  "routeSystemsProtected",
  "systemStateComplete",
  "systemModeBeta",
  "sessionApiBlocked",
  "governanceWildcardBlocked",
  "betaAutonomousBlocked",
  "telemetryLive",
  "ghostConnected",
  "headerSystemModeBeta",
];

/**
 * @param {string | null | undefined} observed
 * @param {string | null | undefined} expected
 */
export function commitShaMatches(observed, expected) {
  if (!expected) return true;
  const sha = observed?.trim();
  if (!sha || sha === "unknown") return false;
  const want = expected.trim();
  return sha === want || sha.startsWith(want) || want.startsWith(sha);
}

/**
 * @param {"production" | "staging" | string | undefined} deployEnv
 */
export function expectedSystemModeForDeployEnv(deployEnv) {
  if (deployEnv === "staging") return "OPERATOR_BETA";
  if (deployEnv === "production") return "PRODUCTION";
  return null;
}

/**
 * @param {string | null | undefined} deployEnv
 * @param {string | null | undefined} systemMode
 */
export function systemModeMatchesDeployEnv(deployEnv, systemMode) {
  const expected = expectedSystemModeForDeployEnv(deployEnv);
  if (!expected) return Boolean(systemMode);
  return systemMode === expected;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function probeJson(base, path, init = {}) {
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
  return {
    path,
    status: r.status,
    location: r.headers.get("location"),
    headers: Object.fromEntries(r.headers),
    json,
  };
}

export async function probeHtml(base, path) {
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
    isOperatorTerminal: text.includes("Operator Terminal"),
  };
}

/**
 * Retry build-info when commitSha is temporarily "unknown" after deploy propagation.
 */
export async function probeBuildInfo(base, { expectedCommit = null, maxAttempts = 5 } = {}) {
  let last = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    last = await probeJson(base, "/api/build-info");
    const sha = last.json?.commitSha;
    const ready = last.status === 200 && typeof sha === "string" && sha !== "unknown";
    const matches = !expectedCommit || commitShaMatches(sha, expectedCommit);
    if (ready && matches) return last;
    if (ready && !expectedCommit) return last;
    if (attempt < maxAttempts - 1) await sleep(1000);
  }
  return last;
}

/**
 * @param {import("./verifyOperatorDeployArgs.mjs").VerifyMode} mode
 */
export function checksForMode(mode) {
  if (mode === "handoff") return HANDOFF_CHECK_NAMES;
  if (mode === "beta") return BETA_CHECK_NAMES;
  return [...HANDOFF_CHECK_NAMES, ...BETA_CHECK_NAMES];
}

/**
 * @typedef {import("./verifyOperatorDeployArgs.mjs").VerifyMode} VerifyMode
 */

/**
 * @param {{ mode: VerifyMode, baseUrl: string, expectedCommit: string | null }} options
 */
export async function runVerifyOperatorDeploy({ mode, baseUrl, expectedCommit }) {
  const buildInfo = await probeBuildInfo(baseUrl, { expectedCommit });
  const engineHealth = await probeJson(baseUrl, "/api/engine/health");
  const engineVersion = await probeJson(baseUrl, "/api/engine/version");
  const protectedSecurity = await probeJson(baseUrl, "/api/security/events");
  const protectedTtx = await probeJson(baseUrl, "/api/ttx/sessions/scenarios");
  const protectedWebhooks = await probeJson(baseUrl, "/api/webhooks/events");
  const systemStatus = await probeJson(baseUrl, "/api/system/status");

  const root = await probeHtml(baseUrl, "/");
  const enter = await probeHtml(baseUrl, "/enter");
  const login = await probeHtml(baseUrl, "/login");
  const marketplace = await probeHtml(baseUrl, "/marketplace");
  const systems = await probeHtml(baseUrl, "/systems");
  const dashboard = await probeHtml(baseUrl, "/dashboard");

  const systemState = await probeJson(baseUrl, "/api/system/state");
  const telemetry = await probeJson(baseUrl, "/api/telemetry/summary");
  const ghost = await probeJson(baseUrl, "/api/ghost/telemetry");
  const opsApi = await probeJson(baseUrl, "/api/ops/fedgrade");
  const wildcardBlocked = await probeJson(baseUrl, "/api/ttx/local-scenarios/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "beta-gate-test" }),
  });
  const autonomousBlocked = await probeJson(baseUrl, "/api/lifecycle/advance/run", { method: "POST" });

  const buildCommit = buildInfo.json?.commitSha ?? "";
  const deployEnv = buildInfo.json?.deployEnv;
  const state = systemState.json?.state;
  const statusMode = systemStatus.json?.systemMode;
  const xBuildCommit = buildInfo.headers?.["x-build-commit"] ?? null;

  const allChecks = {
    buildInfoPublic: buildInfo.status === 200 && typeof buildInfo.json?.commitSha === "string" && buildCommit !== "unknown",
    buildInfoCommitMatches: commitShaMatches(buildCommit, expectedCommit),
    xBuildCommitHeader: !expectedCommit || commitShaMatches(xBuildCommit, expectedCommit),
    engineHealthOk: engineHealth.status === 200 && engineHealth.json?.status === "ok",
    engineVersionOk: engineVersion.status === 200 && typeof engineVersion.json?.version === "string",
    engineVersionCommitMatches: !expectedCommit || commitShaMatches(engineVersion.json?.commitSha, expectedCommit),
    systemStatusOk: systemStatus.status === 200 && Boolean(systemStatus.json?.harness || systemStatus.json?.api),
    systemModeMatchesDeployEnv: systemModeMatchesDeployEnv(deployEnv, statusMode),
    protectedSecurityEvents: protectedSecurity.status === 401,
    protectedTtxScenarios: protectedTtx.status === 401,
    protectedWebhookEvents: protectedWebhooks.status === 401,
    routeRootEcosystem: root.surface === "ecosystem" || root.isEcosystem,
    routeLoginAuth: login.surface === "auth" || login.isAuth,
    routeOperatorShellOk: dashboard.status === 200 && (dashboard.surface === "cockpit" || dashboard.isOperatorTerminal),

    routeEnterStorefront: enter.surface === "storefront" || enter.isStorefront,
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
    governanceWildcardBlocked:
      wildcardBlocked.status === 403 && wildcardBlocked.json?.code === "GOVERNANCE_WILDCARD_BLOCKED",
    betaAutonomousBlocked:
      autonomousBlocked.status === 403 && autonomousBlocked.json?.code === "BETA_AUTONOMOUS_BLOCKED",
    telemetryLive:
      telemetry.status === 200 &&
      typeof telemetry.json?.summary?.requestCount === "number" &&
      typeof telemetry.json?.summary?.sessionEvents === "number",
    ghostConnected: ghost.json?.connected === true,
    headerSystemModeBeta: systemState.headers?.["x-system-mode"] === "OPERATOR_BETA",
  };

  const activeNames = checksForMode(mode);
  const checks = Object.fromEntries(activeNames.map((name) => [name, allChecks[name]]));
  const failed = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);

  const handoffFailed = HANDOFF_CHECK_NAMES.filter((name) => !allChecks[name]);
  const betaFailed = BETA_CHECK_NAMES.filter((name) => !allChecks[name]);

  const health =
    failed.length === 0
      ? "STABLE"
      : failed.some((n) => n.includes("systemState") || n.includes("ghost") || n.includes("buildInfo"))
        ? "CRITICAL"
        : "DEGRADED";

  return {
    mode,
    base: baseUrl,
    environment: deployEnv ?? "unknown",
    expectedCommitSha: expectedCommit,
    observedCommitSha: buildCommit || null,
    deploymentStatus: failed.length === 0 ? "success" : "failed",
    systemMode: statusMode ?? state?.systemMode ?? "NOT_SET",
    systemHealth: health,
    failedChecks: failed,
    handoffFailedChecks: handoffFailed,
    betaFailedChecks: betaFailed,
    routes: { root, enter, login, marketplace, systems, dashboard },
    systemState: { status: systemState.status, systemMode: state?.systemMode, ghostConnected: state?.ghost?.connected },
    telemetry: telemetry.json?.summary,
    ghost: { connected: ghost.json?.connected, authMethod: ghost.json?.authMethod },
    sessionEnforcement: { systems: systems.status, opsApi: opsApi.status, opsApiCode: opsApi.json?.code },
    governance: { wildcardBlocked: wildcardBlocked.status, autonomousBlocked: autonomousBlocked.status },
    buildInfo: {
      status: buildInfo.status,
      commitSha: buildCommit,
      deployEnv,
      buildTimestamp: buildInfo.json?.buildTimestamp ?? null,
      expectedCommit,
      commitMatches: allChecks.buildInfoCommitMatches,
      xBuildCommit,
    },
    engineHealth: { status: engineHealth.status, body: engineHealth.json },
    engineVersion: { status: engineVersion.status, body: engineVersion.json },
    protectedApis: {
      securityEvents: protectedSecurity.status,
      ttxScenarios: protectedTtx.status,
      webhookEvents: protectedWebhooks.status,
    },
    systemStatus: { status: systemStatus.status, systemMode: statusMode, body: systemStatus.json },
    checks,
    allChecks,
  };
}

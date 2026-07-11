import { PUBLIC_CAPTURE_ROUTES } from "../routes.ts";
import { evidenceHash } from "../hash.ts";
import { redactSensitiveText } from "../redact.ts";
import type { PrismRouteProbeResult, PrismStagingPreflight } from "./types.ts";
import { resolveStagingTarget } from "./targetPolicy.ts";
import { emitStagingTelemetry } from "./telemetry.ts";
import { stagingFetch } from "./stagingFetch.ts";

const REQUIRED_PUBLIC_ROUTES = [...PUBLIC_CAPTURE_ROUTES];

async function probeRoute(origin: string, route: string): Promise<PrismRouteProbeResult> {
  const response = await stagingFetch(new URL(route, origin), { redirect: "manual" });
  return {
    route,
    status: response.status,
    ok: response.status >= 200 && response.status < 400,
    contentType: response.headers.get("content-type") ?? undefined,
  };
}

export async function runStagingPreflight(originInput?: string): Promise<PrismStagingPreflight> {
  const target = resolveStagingTarget(originInput);
  const checkedAt = new Date().toISOString();
  const warnings: string[] = [];
  const failures: string[] = [];

  emitStagingTelemetry({
    event: "prism_staging_preflight_started",
    environment: "staging",
    timestamp: checkedAt,
  });

  let healthStatus: PrismStagingPreflight["healthStatus"] = "ok";
  let buildCommit: string | undefined;
  let buildTimestamp: string | undefined;
  let appVersion: string | undefined;
  let deployEnv: string | undefined;

  try {
    const health = await stagingFetch(new URL("/api/engine/health", target.origin));
    if (!health.ok) {
      failures.push(`engine health returned ${health.status}`);
      healthStatus = "failed";
    }
  } catch (err) {
    failures.push(`engine health unreachable: ${redactSensitiveText(String(err))}`);
    healthStatus = "failed";
  }

  try {
    const buildInfo = await stagingFetch(new URL("/api/build-info", target.origin));
    if (buildInfo.ok) {
      const body = (await buildInfo.json()) as {
        commitSha?: string;
        buildTimestamp?: string;
        version?: string;
        deployEnv?: string;
      };
      buildCommit = body.commitSha;
      buildTimestamp = body.buildTimestamp;
      appVersion = body.version;
      deployEnv = body.deployEnv;
      if (deployEnv && deployEnv !== "staging") {
        failures.push(`build-info deployEnv is ${deployEnv}, expected staging`);
        healthStatus = "failed";
      }
    } else {
      warnings.push(`build-info returned ${buildInfo.status}`);
      if (healthStatus === "ok") healthStatus = "degraded";
    }
  } catch {
    warnings.push("build-info unavailable");
    if (healthStatus === "ok") healthStatus = "degraded";
  }

  const routeProbeResults: PrismRouteProbeResult[] = [];
  for (const route of REQUIRED_PUBLIC_ROUTES) {
    try {
      const probe = await probeRoute(target.origin, route);
      routeProbeResults.push(probe);
      if (!probe.ok) failures.push(`route probe failed for ${route} (${probe.status})`);
    } catch (err) {
      routeProbeResults.push({ route, status: 0, ok: false });
      failures.push(`route probe error for ${route}: ${redactSensitiveText(String(err))}`);
    }
  }

  let authEndpointStatus: PrismStagingPreflight["authEndpointStatus"] = "ok";
  try {
    const authProbe = await stagingFetch(new URL("/api/auth/login", target.origin), { method: "POST" });
    if (authProbe.status === 503) {
      authEndpointStatus = "unavailable";
      failures.push("auth login endpoint unavailable (503)");
    } else if (authProbe.status >= 500) {
      authEndpointStatus = "failed";
      failures.push(`auth login endpoint failed (${authProbe.status})`);
    }
  } catch {
    authEndpointStatus = "failed";
    failures.push("auth login endpoint unreachable");
  }

  let prismEndpointStatus: PrismStagingPreflight["prismEndpointStatus"] = "ok";
  try {
    const prismProbe = await stagingFetch(new URL("/api/operator/uiux/audits", target.origin));
    if (prismProbe.status !== 401 && prismProbe.status !== 403) {
      prismEndpointStatus = "failed";
      failures.push(`PRISM endpoint expected 401/403 without auth, got ${prismProbe.status}`);
    }
  } catch {
    prismEndpointStatus = "unavailable";
    failures.push("PRISM endpoint unreachable");
  }

  const payload = {
    origin: target.origin,
    canonicalOrigin: target.canonicalOrigin,
    environment: "staging" as const,
    checkedAt,
    healthStatus,
    buildCommit,
    buildTimestamp,
    appVersion,
    deployEnv,
    routeProbeResults,
    authEndpointStatus,
    prismEndpointStatus,
    warnings,
    failures,
  };

  const result: PrismStagingPreflight = {
    ...payload,
    evidenceHash: evidenceHash(payload),
    passed: failures.length === 0,
  };

  emitStagingTelemetry({
    event: result.passed ? "prism_staging_preflight_completed" : "prism_staging_preflight_failed",
    environment: "staging",
    evidenceHash: result.evidenceHash,
    timestamp: new Date().toISOString(),
  });

  return result;
}

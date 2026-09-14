import { BUNDLED_APP_VERSION, BUNDLED_BUILD_COMMIT_SHA, BUNDLED_BUILD_TIMESTAMP } from "./bundledBuildInfo";
import { resolveSystemMode, type ModeEnv } from "./mode";

/** Canonical Worker identity labels — must match wrangler `name` / env.staging.name. */
export const PRODUCTION_WORKER_NAME = "ttx-operator-shell";
export const STAGING_WORKER_NAME = "ttx-operator-shell-staging";

export interface BuildInfoEnv {
  APP_VERSION?: string;
  DEPLOY_ENV?: string;
  BUILD_COMMIT_SHA?: string;
  BUILD_TIMESTAMP?: string;
  /** Explicit Worker identity for /api/build-info evidence. */
  WORKER_NAME?: string;
}

export interface BuildInfoPayload {
  version: string;
  commitSha: string;
  buildTimestamp: string;
  deployEnv: string;
  workerName: string;
}

/**
 * Resolve the Worker identity reported by /api/build-info.
 * Prefer explicit WORKER_NAME (wrangler vars). Fall back from DEPLOY_ENV so
 * staging never silently reports the production Worker name.
 */
export function resolveWorkerName(env: BuildInfoEnv): string {
  const explicit = String(env.WORKER_NAME ?? "").trim();
  if (explicit) return explicit;
  if (String(env.DEPLOY_ENV ?? "").trim() === "staging") {
    return STAGING_WORKER_NAME;
  }
  return PRODUCTION_WORKER_NAME;
}

export function resolveBuildInfo(env: BuildInfoEnv): BuildInfoPayload {
  return {
    version: env.APP_VERSION ?? BUNDLED_APP_VERSION ?? "0.0.0",
    commitSha: env.BUILD_COMMIT_SHA ?? BUNDLED_BUILD_COMMIT_SHA ?? "unknown",
    buildTimestamp: env.BUILD_TIMESTAMP ?? BUNDLED_BUILD_TIMESTAMP ?? "",
    deployEnv: env.DEPLOY_ENV ?? "unknown",
    workerName: resolveWorkerName(env),
  };
}

export function stampBuildHeaders(response: Response, env: BuildInfoEnv & ModeEnv): Response {
  const info = resolveBuildInfo(env);
  const headers = new Headers(response.headers);
  headers.set("X-Build-Commit", info.commitSha);
  headers.set("X-App-Version", info.version);
  headers.set("X-Deploy-Env", info.deployEnv);
  headers.set("X-System-Mode", resolveSystemMode(env));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function handleBuildInfoRoute(request: Request, pathname: string, env: BuildInfoEnv): Response | null {
  if (pathname !== "/api/build-info") return null;
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }
  return stampBuildHeaders(Response.json(resolveBuildInfo(env)), env);
}

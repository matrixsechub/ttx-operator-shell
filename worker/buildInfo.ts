import { BUNDLED_APP_VERSION, BUNDLED_BUILD_COMMIT_SHA, BUNDLED_BUILD_TIMESTAMP } from "./bundledBuildInfo";
import { resolveSystemMode, type ModeEnv } from "./mode";

export interface BuildInfoEnv {
  APP_VERSION?: string;
  DEPLOY_ENV?: string;
  BUILD_COMMIT_SHA?: string;
  BUILD_TIMESTAMP?: string;
}

export interface BuildInfoPayload {
  version: string;
  commitSha: string;
  buildTimestamp: string;
  deployEnv: string;
  workerName: string;
}

export function resolveBuildInfo(env: BuildInfoEnv, workerName = "ttx-operator-shell"): BuildInfoPayload {
  return {
    version: env.APP_VERSION ?? BUNDLED_APP_VERSION ?? "0.0.0",
    commitSha: env.BUILD_COMMIT_SHA ?? BUNDLED_BUILD_COMMIT_SHA ?? "unknown",
    buildTimestamp: env.BUILD_TIMESTAMP ?? BUNDLED_BUILD_TIMESTAMP ?? "",
    deployEnv: env.DEPLOY_ENV ?? "unknown",
    workerName,
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

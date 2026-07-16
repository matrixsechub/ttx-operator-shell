import { getAccessTokenOperator, type AuthEnv } from "../auth";
import { timingSafeEqual } from "../edge/crypto";
import { jsonResponse } from "../http";
import { evaluateHsxScopeGate, type HsxScopeGateEnv } from "./gate";

export type HsxScopeGateRouteEnv = HsxScopeGateEnv & AuthEnv & { N8N_WEBHOOK_SECRET?: string };
const ROUTE = "/api/governance/hsx/scope-gate/evaluate";
const MAX_BODY_BYTES = 64 * 1024;

async function authorized(request: Request, env: HsxScopeGateRouteEnv): Promise<boolean> {
  const provided = request.headers.get("X-N8N-Webhook-Secret");
  if (provided && env.N8N_WEBHOOK_SECRET && (await timingSafeEqual(provided, env.N8N_WEBHOOK_SECRET))) return true;
  return (await getAccessTokenOperator(request, env)) !== null;
}

export async function handleHsxScopeGateRoute(
  request: Request,
  pathname: string,
  env: HsxScopeGateRouteEnv,
): Promise<Response | null> {
  if (pathname !== ROUTE) return null;
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  if (!(await authorized(request, env))) return jsonResponse({ error: "Operator or n8n authentication required", code: "SCOPE_GATE_AUTH_REQUIRED" }, 401);
  if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    return jsonResponse({ error: "Content-Type must be application/json", code: "CONTENT_TYPE_REQUIRED" }, 415);
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return jsonResponse({ error: "Payload too large", code: "PAYLOAD_TOO_LARGE" }, 413);
  let payload: unknown;
  try {
    payload = JSON.parse(raw) as unknown;
  } catch {
    return jsonResponse({ error: "Invalid JSON body", code: "INVALID_JSON" }, 400);
  }
  const result = await evaluateHsxScopeGate(env, payload);
  const status = result.outcome === "approved"
    ? 200
    : result.reason_code === "SCHEMA_INVALID"
      ? 400
      : result.reason_code === "TRACKING_WRITE_FAILED" || result.reason_code === "TRACKING_READ_FAILED"
        ? 503
        : 403;
  return jsonResponse({ ok: result.outcome === "approved", decision: result }, status);
}

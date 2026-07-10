import { redactSensitiveText } from "../redact.ts";
import { emitStagingTelemetry } from "./telemetry.ts";
import { stagingFetch } from "./stagingFetch.ts";

export type EdgeAuthResult = { ok: true; token: string } | { ok: false; error: string };

export async function bootstrapEdgeApiToken(origin: string): Promise<EdgeAuthResult> {
  const preconfigured =
    process.env.PRISM_OPERATOR_EDGE_TOKEN ??
    process.env.OPERATOR_BEARER_TOKEN ??
    process.env.PRISM_OPERATOR_BEARER_TOKEN;
  if (preconfigured?.trim()) {
    return { ok: true, token: preconfigured.trim() };
  }

  const password = process.env.PRISM_OPERATOR_PASSWORD ?? process.env.OPERATOR_PASSWORD;
  const username =
    process.env.PRISM_OPERATOR_USERNAME ??
    process.env.PRISM_OPERATOR_CALLSIGN ??
    process.env.OPERATOR_CALLSIGN ??
    "operator";

  if (!password) {
    return { ok: false, error: "Edge API credentials not configured" };
  }

  emitStagingTelemetry({ event: "prism_staging_auth_started", timestamp: new Date().toISOString() });

  const authResponse = await stagingFetch(new URL("/api/operator/auth", origin), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (authResponse.ok) {
    const body = (await authResponse.json()) as { token?: string };
    if (body.token) {
      emitStagingTelemetry({ event: "prism_staging_auth_completed", timestamp: new Date().toISOString() });
      return { ok: true, token: body.token };
    }
  }

  const sessionResponse = await stagingFetch(new URL("/api/operator/session", origin), { method: "POST" });
  if (!sessionResponse.ok) {
    const detail = redactSensitiveText(await authResponse.text().catch(() => ""));
    emitStagingTelemetry({ event: "prism_staging_auth_failed", timestamp: new Date().toISOString() });
    return { ok: false, error: `Edge authentication failed (${authResponse.status}) ${detail.slice(0, 120)}` };
  }

  const sessionBody = (await sessionResponse.json()) as { operator_token?: string; token?: string };
  const token = sessionBody.operator_token ?? sessionBody.token;
  if (!token) {
    emitStagingTelemetry({ event: "prism_staging_auth_failed", timestamp: new Date().toISOString() });
    return { ok: false, error: "Edge session response missing token" };
  }

  emitStagingTelemetry({ event: "prism_staging_auth_completed", timestamp: new Date().toISOString() });
  return { ok: true, token };
}

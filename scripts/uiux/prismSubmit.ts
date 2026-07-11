import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PrismCaptureManifest } from "./types.ts";
import type { UiUxAuditRequest } from "../../worker/data/prismUiuxTypes.ts";
import { manifestToAuditRequest } from "./prismAdapter.ts";
import { redactObject } from "./redact.ts";
import { emitTelemetry } from "./telemetry.ts";

export type PrismSubmitOptions = {
  origin: string;
  request: UiUxAuditRequest;
  artifactDir: string;
  bearerToken?: string;
  skipIfDuplicate?: boolean;
};

export type PrismSubmitResult = {
  ok: boolean;
  status: number;
  duplicate?: boolean;
  body?: unknown;
  error?: string;
};

export async function submitPrismAudit(options: PrismSubmitOptions): Promise<PrismSubmitResult> {
  const token =
    options.bearerToken ??
    (process.env.PRISM_OPERATOR_BEARER_TOKEN
      ? process.env.PRISM_OPERATOR_BEARER_TOKEN
      : undefined);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const safeRequest = redactObject(options.request);
  writeFileSync(join(options.artifactDir, "prism-request.json"), JSON.stringify(safeRequest, null, 2));

  if (options.skipIfDuplicate && options.request.idempotencyKey) {
    const check = await fetch(
      new URL(`/api/operator/uiux/audits/idempotency/${encodeURIComponent(options.request.idempotencyKey)}`, options.origin),
      { headers },
    );
    if (check.ok) {
      const body = await check.json();
      return { ok: true, status: 200, duplicate: true, body };
    }
  }

  const response = await fetch(new URL("/api/operator/uiux/audits", options.origin), {
    method: "POST",
    headers,
    body: JSON.stringify(safeRequest),
  });

  const body = await response.json().catch(() => ({}));
  writeFileSync(join(options.artifactDir, "prism-response.json"), JSON.stringify(redactObject(body), null, 2));

  if (!response.ok) {
    emitTelemetry({
      event: "prism_audit_submission_failed",
      captureId: options.request.captureId ?? "unknown",
      status: String(response.status),
      timestamp: new Date().toISOString(),
    });
    return { ok: false, status: response.status, error: (body as { error?: string }).error ?? "Submission failed", body };
  }

  emitTelemetry({
    event: "prism_audit_submitted",
    captureId: options.request.captureId ?? "unknown",
    status: "ok",
    timestamp: new Date().toISOString(),
  });

  return { ok: true, status: response.status, body };
}

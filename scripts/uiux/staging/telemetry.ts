import { redactObject } from "../redact.ts";

export type PrismStagingTelemetryEvent = {
  event:
    | "prism_staging_preflight_started"
    | "prism_staging_preflight_completed"
    | "prism_staging_preflight_failed"
    | "prism_staging_route_validated"
    | "prism_staging_auth_started"
    | "prism_staging_auth_completed"
    | "prism_staging_auth_failed"
    | "prism_staging_capture_completed"
    | "prism_fixture_drift_completed"
    | "prism_staging_audit_submitted"
    | "prism_staging_idempotency_verified"
    | "prism_staging_secret_scan_completed"
    | "prism_staging_validation_completed"
    | "prism_staging_validation_failed"
    | "prism_staging_triage_smoke_completed";
  runId?: string;
  captureId?: string;
  routeHash?: string;
  viewport?: string;
  durationMs?: number;
  result?: string;
  environment?: string;
  auditId?: string;
  evidenceHash?: string;
  violationCount?: number;
  timestamp: string;
};

export function emitStagingTelemetry(event: PrismStagingTelemetryEvent): void {
  const safe = redactObject(event);
  console.log(JSON.stringify({ prism_staging_telemetry: safe }));
}

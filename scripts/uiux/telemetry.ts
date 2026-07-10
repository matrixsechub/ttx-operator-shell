import type { PrismCaptureGovernance, PrismTelemetryEvent } from "./types.ts";
import { redactObject } from "./redact.ts";

export function emitTelemetry(event: PrismTelemetryEvent): void {
  const safe = redactObject(event);
  console.log(JSON.stringify({ prism_telemetry: safe }));
}

export function buildGovernanceEnvelope(input: Omit<PrismCaptureGovernance, "mutationAuthorized">): PrismCaptureGovernance {
  return { ...input, mutationAuthorized: false };
}

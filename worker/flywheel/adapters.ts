import type { FlywheelStageId } from "../../shared/flywheel/contracts";
import { withFlywheelRetry } from "./errors";

export interface AdapterExecutionContext { runId: string; missionId: string; tenantId: string; stageId: FlywheelStageId; traceId: string; idempotencyKey: string; input: Record<string, unknown> }
export interface AdapterExecutionResult { artifactRefs: string[]; evidenceRefs: string[]; metrics: Record<string, number>; summary: string }
export interface FlywheelStageAdapter {
  readonly stageId: FlywheelStageId;
  validateConfiguration(): Promise<{ valid: boolean; errors: string[] }>;
  healthCheck(): Promise<{ ok: boolean; mode: "mock" | "disabled" }>;
  execute(context: AdapterExecutionContext): Promise<AdapterExecutionResult>;
  cancel(runId: string): Promise<void>;
  normalizeError(error: unknown): Error;
  emitTelemetry(event: string, metadata: Record<string, unknown>): Promise<void>;
}

export class DeterministicMockAdapter implements FlywheelStageAdapter {
  constructor(readonly stageId: FlywheelStageId) {}
  async validateConfiguration() { return { valid: true, errors: [] }; }
  async healthCheck() { return { ok: true, mode: "mock" as const }; }
  async execute(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
    const key = `${context.tenantId}:${context.runId}:${this.stageId}:${context.idempotencyKey}`;
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
    const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    return { artifactRefs: [`mock://${this.stageId}/${hex.slice(0, 16)}`], evidenceRefs: [`sha256:${hex}`], metrics: { deterministic_outputs: 1 }, summary: `Mock ${this.stageId} execution completed.` };
  }
  async cancel(_runId: string) { return; }
  normalizeError(error: unknown) { return error instanceof Error ? error : new Error("Mock adapter failure"); }
  async emitTelemetry(_event: string, _metadata: Record<string, unknown>) { return; }
}

export class SignedWebhookClient {
  constructor(private readonly endpoint: string | undefined, private readonly secret: string | undefined) {}
  async execute(context: AdapterExecutionContext): Promise<Record<string, unknown>> {
    const endpoint = this.endpoint;
    const secret = this.secret;
    if (!endpoint || !secret) throw new Error("WEBHOOK_ADAPTER_DISABLED");
    return withFlywheelRetry(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8_000);
      try {
        const payload = JSON.stringify({ missionId: context.missionId, runId: context.runId, stageId: context.stageId, traceId: context.traceId, idempotencyKey: context.idempotencyKey, input: context.input });
        const signatureBytes = await crypto.subtle.sign("HMAC", await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), new TextEncoder().encode(payload));
        const signature = [...new Uint8Array(signatureBytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
        const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", "X-Flywheel-Signature": signature, "Idempotency-Key": context.idempotencyKey }, body: payload, signal: controller.signal });
        if (!response.ok) throw new Error(`WEBHOOK_PROVIDER_${response.status}`);
        const result = await response.json();
        if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("SCHEMA_MISMATCH");
        return result as Record<string, unknown>;
      } finally { clearTimeout(timeout); }
    });
  }
}

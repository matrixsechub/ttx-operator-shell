import { recordGovernanceEvent, type TelemetryContextEnv } from "./telemetry";

export type IntentQualificationTelemetryEvent =
  | "intent_qualification_started"
  | "intent_qualification_completed"
  | "intent_qualification_failed"
  | "intent_routed"
  | "intent_operator_review_required"
  | "qualification_proposal_generated";

export interface IntentQualificationTelemetryPayload {
  captureId: string;
  intentType?: string;
  priority?: string;
  recommendedRoute?: string;
  environment: string;
  testRunId?: string;
  timestamp: string;
}

function boundedPayload(
  payload: IntentQualificationTelemetryPayload,
): Record<string, unknown> {
  return {
    captureId: payload.captureId.slice(0, 128),
    ...(payload.intentType ? { intentType: payload.intentType.slice(0, 64) } : {}),
    ...(payload.priority ? { priority: payload.priority.slice(0, 16) } : {}),
    ...(payload.recommendedRoute
      ? { recommendedRoute: payload.recommendedRoute.split("?")[0]?.slice(0, 128) }
      : {}),
    environment: payload.environment.slice(0, 32),
    ...(payload.testRunId ? { testRunId: payload.testRunId.slice(0, 64) } : {}),
    timestamp: payload.timestamp,
  };
}

export async function recordIntentQualificationTelemetry(
  env: TelemetryContextEnv,
  event: IntentQualificationTelemetryEvent,
  payload: IntentQualificationTelemetryPayload,
): Promise<void> {
  await recordGovernanceEvent(env, event, boundedPayload(payload));
}

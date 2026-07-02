// Structured telemetry event shape. "stream" categorizes origin (scenario /
// module / operator) as a plain discriminator field on one event type —
// there is no literal message bus or pub-sub transport here. Events are
// delivered the same way everything else in this app is: polled over
// /api/* via useApiResource, same pattern as Status.tsx and the TTX module.
export type TelemetryStream = "scenario" | "module" | "operator";
export type TelemetrySeverity = "info" | "warn" | "critical";

export interface TelemetryEvent {
  id: string;
  stream: TelemetryStream;
  type: string;
  message: string;
  timestamp: string;
  severity?: TelemetrySeverity;
}

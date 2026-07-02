// Event shape returned by worker/security.ts's GET /api/security/events.
// Mirrors that file's SecurityEvent/SecurityEventType — not imported
// directly, same deliberate small duplication as WebhookEvent in
// src/lib/webhookTrigger.ts, since the Worker and app are separate
// TypeScript projects by design.
export type SecurityEventType =
  | "auth_failed"
  | "invalid_token"
  | "webhook_malformed"
  | "webhook_signature_failed"
  | "webhook_duplicate_payload"
  | "webhook_burst"
  | "webhook_spike";

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface SecurityEventsResponse {
  events: SecurityEvent[];
}

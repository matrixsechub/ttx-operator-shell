// Event shape returned by worker/webhookTrigger.ts's GET /api/webhooks/events.
// Mirrors that file's WebhookEvent type — not imported directly, same
// deliberate small duplication as CatalogItem in worker/catalogData.ts,
// since the Worker and app are separate TypeScript projects by design.
export interface WebhookEvent {
  id: string;
  receivedAt: string;
  payload: unknown;
  test?: boolean;
}

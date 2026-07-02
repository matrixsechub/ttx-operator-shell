// Event shape returned by worker/webhookTrigger.ts's GET /api/webhooks/events.
// Mirrors that file's WebhookEvent type — not imported directly, same
// deliberate small duplication as CatalogItem in worker/catalogData.ts,
// since the Worker and app are separate TypeScript projects by design.
export interface WebhookEvent {
  id: string;
  receivedAt: string;
  payload: unknown;
  test?: boolean;
  source?: string;
  type?: string;
}

export interface WebhookEventFilter {
  source?: string;
  type?: string;
}

export interface WebhookEventQuery extends WebhookEventFilter {
  /** Offset-as-string, opaque to callers — pass back whatever the previous response's nextCursor was. */
  cursor?: string;
  pageSize?: number;
}

// Response envelope for GET /api/webhooks/events — kept separate from
// WebhookEvent itself since this describes the paginated response shape,
// not an event.
export interface WebhookEventsPage {
  events: WebhookEvent[];
  nextCursor?: string;
  /** Total matching events (after filtering, before pagination) — drives "Showing X of Y". */
  total: number;
}

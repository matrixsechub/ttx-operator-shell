# Organic Activation n8n Contract (V1)

Operator-gated daily brief workflow stub. **No auto-posting, spending, or experiment mutation.**

## Webhook / HTTP contract

| Item | Value |
|------|-------|
| Overview source | `GET /api/operator/activation/overview` |
| Auth | Operator JWT (`Authorization: Bearer <token>`) |
| Progress (public read) | `GET /api/traffic/activation` (no campaign detail) |

## Optional ingest webhook

Existing signed ingest pattern: `POST /api/webhooks/ingest` with HMAC (`worker/webhookTrigger.ts`).

| Env var | Purpose |
|---------|---------|
| `ACTIVATION_WEBHOOK_SECRET` | HMAC secret for inbound activation brief payloads (optional) |
| `ACTIVATION_OPERATOR_NOTIFY_URL` | Outbound destination for formatted daily brief (operator-configured) |
| `ACTIVATION_OPERATOR_BASE_URL` | Base URL for n8n HTTP node (staging or production) |

## Retry policy (recommended)

- HTTP 5xx / network: exponential backoff, max 5 attempts
- HTTP 401/403: do not retry — refresh operator token
- HTTP 503 with `activation_safe_mode`: log blockers, skip notify

## Daily brief payload shape

```json
{
  "subject": "Organic Activation Daily Brief",
  "qualifiedOrganic": 0,
  "blockers": ["qualified_organic_below_target"],
  "confidence": "LOW",
  "promotionWinner": null,
  "generatedAt": "2026-07-10T12:00:00.000Z"
}
```

## Workflow file

`workflows/n8n/organic-activation-daily-brief.stub.json` — import into n8n and configure credentials manually.

## CLI alternatives

- `node scripts/organic-activation-daily-brief.mjs [baseUrl]`
- `node scripts/organic-activation-progress-report.mjs [baseUrl]`

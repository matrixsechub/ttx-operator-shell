# OPERATOR-NOTIFICATIONS — implementation record (Track 6)

**Status:** IMPLEMENTED | **Date:** 2026-07-16 | **Source:**
`worker/operatorNotifications.ts`

## 1. The channel

`notifyOperator(env, event)` is the sanctioned worker → n8n → operator notification
path. Existing webhook infra (`worker/webhookTrigger.ts`) is inbound-only; this is the
first outbound egress and is explicitly gated.

**Event envelope:** `{ kind, at, subject?, captureId?, data? }`.

**Kinds:** `qualify-reached`, `marketplace-intent`, `entitlement-grant`,
`tier-upgrade`, `billing-webhook`, `qualification-anomaly`.

## 2. Dispatch model

1. **Always:** one structured `console.log` (kind + ids + timestamp; never payload
   contents or secrets) and an append to the KV ring log
   `pearl:notifications:log` (last 50, 7-day TTL).
2. **If `N8N_NOTIFY_WEBHOOK_URL` is set:** fire-and-forget `POST` of the JSON envelope,
   5s timeout, with `X-Pearl-Signature: HMAC-SHA256(body, N8N_NOTIFY_SECRET)` when the
   secret is configured (unsigned if not). Failures are swallowed — notification
   egress can never fail a user-facing request.
3. **If the URL is unset:** NO egress of any kind — observability is the KV log +
   console only.

**Capture-policy note:** this is operator-notification egress to a configured
endpoint, not growth capture and not a debug ingest — it does not trip R15 (no
`127.0.0.1` ingest, no `X-Debug-Session-Id`, no agent-log blocks).

## 3. Emit sites (wired)

| Kind | Site |
|---|---|
| `qualify-reached` | `qualificationRuntime` — when an evidence write transitions the fold INTO QUALIFY (pre/post stage compared) |
| `qualification-anomaly` | `qualificationRuntime` — capture-not-found (404) and evidence-cap-reached (409) |
| `marketplace-intent` | `marketplaceIntentRouter` — every routed intent |
| `entitlement-grant` | `marketplaceBillingWorker.settleGrant` — on M3-4 settle (sandbox + webhook) |
| `billing-webhook` | `marketplaceBillingWorker` — on signature-verified webhook receipt |
| `tier-upgrade` | `tierWorker` — on a tier change via `/api/tier/set` |

## 4. Observability endpoint

`GET /api/notifications/recent` — operator-gated (NOT in the public allow-list; the
default-deny apiAuth gate requires operator JWT). Returns
`{ events, egressConfigured }` so the operator can read the ring log and see whether
n8n egress is active, without any n8n dependency.

## 5. Activation notes for real n8n

`wrangler secret put N8N_NOTIFY_WEBHOOK_URL` (or a `vars` entry) + optionally
`N8N_NOTIFY_SECRET`; point it at the n8n webhook node and verify `X-Pearl-Signature`
there. Until then the system runs fully with log-only observability.

## 6. Tests

`tests/autonomyRoutes.test.ts` — ring log persists + `/recent` reads it + **no egress
attempted when the URL is unset** (fetch spy), and a configured URL dispatches a
**signed** POST (64-hex signature asserted).

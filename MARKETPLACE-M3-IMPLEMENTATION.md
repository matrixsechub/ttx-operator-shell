# MARKETPLACE-M3-IMPLEMENTATION — implementation record (Track 5)

**Status:** IMPLEMENTED (Stripe-ready + sandbox, per Council billing decision) |
**Date:** 2026-07-16 | **Contracts:** MARKETPLACE-M3.md, BILLING-PACKET.md

## 1. Acquisition runtime (`worker/marketplaceBillingWorker.ts`)

```
M3-1 intent ──► M3-2 billing ──► M3-3 confirmation ──► M3-4 grant
   403 if tier lacks marketplace.acquire      settleGrant() single writer
```

**Provider model:**
- **Stripe** — active iff `STRIPE_SECRET_KEY` is set. Hosted Checkout Session via
  REST (`api.stripe.com/v1/checkout/sessions`, no SDK), `acquisition_id` in metadata.
  Grants happen ONLY from the signature-verified webhook (`STRIPE_WEBHOOK_SECRET`,
  HMAC-SHA256 `t.v1` scheme, timing-safe compare) — provider state wins.
- **Sandbox** — active iff `BILLING_SANDBOX === "true"` or `DEPLOY_ENV` ≠ production
  (and Stripe unset). Settles synchronously; acquisitions stamped `sandbox: true`.
- **Neither** — `503 billing not configured`. Production without keys can never
  charge or mint a grant (test-proven).

**Endpoints:** `POST /api/billing/checkout-session` (validated: item exists, carries
a pack-family tag, subject resolvable, tier holds `marketplace.acquire`),
`POST /api/webhooks/billing` (signature-gated; handles `checkout.session.completed`
→ settle, `checkout.session.expired` → failed), `GET /api/billing/acquisition?id=`
(M3-3 polling). Acquisition records: KV `pearl:acquisition:<uuid>`, 90-day TTL.

**Grant path invariants:** `settleGrant` is idempotent (webhook replays safe);
`grantPack` is the single writer; a failed settle is retryable from the provider
event alone.

## 2. SPA purchase flow (`src/pearl/marketplacePurchase.tsx`)

Rendered inside `CatalogDetailModal` for any item with a pack-family tag:

| Phase | Voice | UI |
|---|---|---|
| intent | AURELIUS | pack summary + `Acquire` CTA (`catalog-acquire-<id>`) |
| billing | HSX | provider handoff ("credentials never touch this app"); Stripe checkout opens in a new tab |
| confirmation | HSX | 2s polling of `/api/billing/acquisition` (60s budget) |
| granted | GHOST | "now part of your kit" (+sandbox badge) |
| blocked | BEACON | tier gate explained — browse everything, acquire nothing on ACCESS |
| failed | HSX | "nothing was charged" + retry |

PRISM events at every phase (`acquire-confirm-`, `acquire-granted-`,
`acquire-retry-`). Token discipline + voice cues lint-enforced (R9–R13).

## 3. Tests (`tests/billingWorker.test.ts`)

Provider resolution matrix; unknown-item 404; ACCESS-tier 403 with upgrade hint;
sandbox end-to-end (checkout → grant → entitlement record → poll shows granted);
production-unconfigured 503 with zero grants; webhook 503/bad-signature 401/valid
signature settles and appends the pack with acquisitionId.

## 4. Activation notes for real Stripe

`wrangler secret put STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`; point the Stripe
webhook at `/api/webhooks/billing`; keep `BILLING_SANDBOX` unset in production.
Refund handling, subscription-mode (tier) checkout, and the customer portal remain
follow-up packets per BILLING-PACKET §6.

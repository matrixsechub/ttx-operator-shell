# BILLING-PACKET — Council decision packet (planning)

**Status:** DECISION PACKET — no billing implementation. This document exists so
Council can make one decision; nothing ships from it. | **Date:** 2026-07-16

## 1. The decision

Choose the billing substrate for the subscription ladder (UPGRADE-PATH.md) and
marketplace M3 (MARKETPLACE-M3.md): **Stripe**, **Paddle**, or **native worker
billing**.

## 2. Comparison

| Criterion | Stripe | Paddle | Native worker |
|---|---|---|---|
| Model | PSP — you are the merchant | Merchant of record (MoR) | Build everything |
| Tax/VAT handling | Stripe Tax (you file) | Paddle files as MoR | You build + file |
| Workers compatibility | Excellent (REST + webhooks; no SDK needed) | Good (REST + webhooks) | n/a |
| Subscription objects | Native (products/prices/subs) | Native | Build |
| One-time pack purchases | Native (payment intents) | Native | Build |
| Webhook → entitlement sync | `checkout.session.completed`, `customer.subscription.*` | `subscription.*`, `transaction.*` | n/a |
| Compliance surface (PCI, SCA) | SAQ-A via Checkout | Handled by MoR | Full burden — **effectively disqualifying** |
| Fees | ~2.9% + 30¢ (+ Tax add-on) | ~5% + 50¢ (tax included) | Hidden (eng + compliance) |
| Lock-in | Moderate | Moderate-high | None |

**Recommendation: Stripe Checkout + customer portal**, unless Council wants zero tax
operations, in which case Paddle. Native worker billing is rejected: card handling,
SCA, and tax filing are outside this system's doctrine (HSX protects operators; it
does not become a payment processor).

## 3. Required worker surfaces (NAMED ONLY — none exist, none are built by Track 4)

| Surface | Purpose | Class |
|---|---|---|
| `POST /api/billing/checkout-session` | Create provider checkout for tier/pack | operator-auth |
| `POST /api/webhooks/billing` | Provider webhook → entitlement sync (signature-verified) | public + signed |
| `GET /api/billing/portal` | Provider-hosted manage/cancel redirect | operator-auth |
| `GET /api/entitlements` | Resolved effective set for the session | operator-auth |

All four are **new endpoints** → blocked by boundary until Council approves this
packet; they ride the R0-restored substrate (guaranteed envelopes, structured
logging, R15 capture policy).

## 4. Required persistence

- **Account model first:** current auth is single-operator JWT (`worker/auth.ts`).
  Multi-account identity is a prerequisite for any billing — this is the largest
  hidden cost in the packet and needs its own design review.
- Entitlement records: KV `entitlement:<accountId>` (tier, packs, provider refs,
  updatedAt) — written ONLY by the webhook handler (single writer), read by the
  resolver (ENTITLEMENT-MODEL.md). DO-backed counter/consistency only if division
  seat-counting demands it.

## 5. Required upgrade flow (UI already planned)

Tier ladder strip + upgrade CTAs exist in MARKETPLACE-WIREFRAMES.md; Option B keeps
capture upstream of any paywall. Voice doctrine: BEACON recommends (ROUTE), OPERATOR
decides (UPGRADE), HSX voices the payment-security reassurance on checkout handoff.

## 6. Council decision points

1. Stripe vs Paddle (recommendation: Stripe; choose Paddle iff zero tax ops is a hard requirement).
2. Approve the four named worker surfaces (unblocks M3 phase design).
3. Account-model packet commissioning (prerequisite for everything above).
4. Refund/downgrade policy (drives latent-grant rules in ENTITLEMENT-MODEL.md §4.2).

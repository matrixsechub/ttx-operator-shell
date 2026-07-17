# MARKETPLACE-M3 — acquisition runtime definition (planning)

**Status:** PLANNING ONLY — no purchase flow implementation. M3 is the final phase of
[MARKETPLACE-INTEGRATION.md](MARKETPLACE-INTEGRATION.md) and depends on the
[BILLING-PACKET.md](BILLING-PACKET.md) decision and
[ENTITLEMENT-MODEL.md](ENTITLEMENT-MODEL.md). | **Date:** 2026-07-16

## 1. CatalogItem → entitlement mapping

Acquisition converts a catalog item into entitlement grants using fields the schema
already carries (`src/lib/types.ts`):

| CatalogItem field | Role in acquisition |
|---|---|
| `id` | Grant subject → `agents.<id>.use` / `ttx.scenarios.<id>` / `intel.<id>.read` |
| `tags` (pack family) | Selects the grant template (ENTITLEMENT-MODEL §3) |
| `service_tier` | Becomes the enforced `minimumTier` (display-only until M3 lands) |
| `kind` | `product` → seat-scoped grant; `content` → division-scalable grant |
| `price` | Provider line item (Stripe price / Paddle product) |
| `access_level` | Post-M3: real catalog lane filter (enterprise lanes) |

Mapping is **declarative data** (a grant-template table checked into the repo), not
code per pack — new packs must not require new code paths.

## 2. Upgrade-intent routing (pre-M3, available now)

Until purchase exists, intent routes through surfaces that already work, keeping every
signal inside the Option B capture-first pipeline:

```
catalog card (cta_click: catalog-item-<id>)
  → detail modal upgrade prompt (catalog-upgrade-<id>)
    → EXISTING /intake funnel with item context (?item=<id>&kind=<family>)
      → register record carries acquisition intent  →  QUALIFY signal
```

## 3. Purchase-flow scaffolding (build order once unblocked)

| Stage | Scaffold | Gate |
|---|---|---|
| P0 | Grant-template table + pure `resolveGrants(item, tier)` (client-testable, no I/O) | After ENTITLEMENT-MODEL approval |
| P1 | Acquisition UI states on detail modal (idle → confirm → handoff → granted/failed), Track 3 primitive style — controlled, logic-free | Design review only |
| P2 | Provider checkout handoff (`/api/billing/checkout-session`) | Billing decision + new-endpoint approval |
| P3 | Webhook → entitlement write → catalog/cockpit reflect grants (`/api/entitlements`) | Account model + persistence packet |
| P4 | Division-scope propagation (ops-division packs) | DO/consistency review |

Failure doctrine: payment failures are provider-authoritative (webhook state wins);
grants are idempotent on webhook replay; a failed P3 write must be retryable from the
provider event alone.

## 4. Voice + doctrine

AURELIUS carries browsing and the acquisition prompt; OPERATOR voices the confirm
step; HSX voices the checkout-security handoff line; GHOST voices post-acquisition
adaptation ("scenario pack now available in your TTX builder"). Token discipline and
capture rules (R9–R15) apply to every new UI state; every acquisition step emits
`data-flow-cta` events (`catalog-acquire-<id>`, `acquire-confirm-<id>`, …).

## 5. Explicitly not in M3

Refund self-service (Council policy first), pack marketplace for third-party sellers,
metered/usage billing, entitlement-gated *content delivery* (SCOPE-LOCK retired
backend delivery flows — reintroduction needs its own packet).

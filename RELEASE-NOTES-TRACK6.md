# Release Notes — Track 6: Autonomy Layer

**Commit:** `3fea9a4` (+ release docs) · **Branch:** `claude/pearl-spectral-track-1-f2tyil`
· **Status:** PR / review — not deployed to production.

## Short form (operator-facing)

Track 6 turns on the **governed autonomy layer**. The system can now recommend a tier
and packs, route marketplace intent, generate an operator blueprint, and notify
operators of key lifecycle events — all **advisory**. Nothing here charges anyone,
grants anything, or changes a subscription on its own: recommendations are advice the
operator acts on. Free-trial (ACCESS) browsing is never blocked. Operator
notifications stay inside the worker unless an n8n webhook is explicitly configured.

## Long form

### New capabilities

- **Recommendation engine** — `POST /api/recommendation/evaluate` reads qualification
  evidence, tier, entitlements, and the pack catalog to suggest a tier (never below
  your current one), tier-aware packs, a next action, and an entity-voiced reason.
  Pure and advisory: it mutates nothing.
- **Upgrade advisor** — an eligibility read of the recommendation, shown as a panel on
  the operator dashboard and a hint in the marketplace purchase modal. Explains what an
  upgrade would activate; never gates the catalog.
- **Marketplace intent router** — `POST /api/marketplace/intent` routes an intent
  (acquire / upgrade / refine / continue) to the purchase flow, tier-upgrade,
  blueprint refinement, or onboarding. When a capture exists, the intent is recorded as
  qualification evidence.
- **Blueprint generator** — `GET /api/blueprint` assembles mission, objective,
  recommended packs, tier, and next steps for a captured prospect.
- **Operator notifications** — six event kinds (qualify-reached, marketplace-intent,
  entitlement-grant, tier-upgrade, billing-webhook, qualification-anomaly). Always
  logged to the worker KV ring log + console; delivered to n8n **only** when
  `N8N_NOTIFY_WEBHOOK_URL` is set, HMAC-signed. `GET /api/notifications/recent`
  (operator-only) reads the ring log.

### Doctrine and safety

- **Advisory only:** no grant or tier mutation anywhere in the layer; Track 5
  single-writer paths (billing settle, tier set) are unchanged.
- **Option B intact:** capture-first; ACCESS never blocked; recommendations never fall
  below the current tier.
- **Egress off by default:** no operator notification leaves the worker unless the n8n
  URL is configured; verified in code (absent from all wrangler configs) and unit-tested
  (no outbound POST when unset).

### Not in this release (blocked)

Multi-account model and division-scoped enforcement are documented
([MULTI-ACCOUNT-MODEL.md](MULTI-ACCOUNT-MODEL.md),
[DIVISION-ENFORCEMENT.md](DIVISION-ENFORCEMENT.md)) but **not implemented**;
enforcement is blocked until the account-model migration
([MULTI-ACCOUNT-MIGRATION.md](MULTI-ACCOUNT-MIGRATION.md)) completes.

### Verification

Lint (R1–R15) green · typecheck clean · 174/174 tests (18 new) · build assembles.
New API surfaces registered in the auth allow-list + route classifier; the
notifications reader stays operator-gated (default-deny).

### Operator actions required

- None for basic operation. To enable n8n delivery later:
  `wrangler secret put N8N_NOTIFY_WEBHOOK_URL` (+ optional `N8N_NOTIFY_SECRET`) —
  **requires security sign-off** before enabling in any shared environment.

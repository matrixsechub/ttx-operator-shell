# MARKETPLACE-INTEGRATION — subscription + upgrade architecture (planning)

**Status:** PLANNING ONLY — no billing, entitlement, or worker changes are
implemented or implied to exist. Anything here that needs a new worker surface is
blocked until R0 worker restoration + Council review. | **Date:** 2026-07-16 |
**Companions:** [UPGRADE-PATH.md](UPGRADE-PATH.md),
[MARKETPLACE-WIREFRAMES.md](MARKETPLACE-WIREFRAMES.md)

## 1. What exists today (the integration substrate)

- Catalog served by `GET /api/marketplace/catalog` (public) from
  `worker/catalogData.ts`; rendered by `CatalogGrid` on the cockpit Marketplace and
  the public StorefrontMarketplace (both AURELIUS-voiced, capture-tagged
  `catalog-item-<id>` since Track 3).
- `CatalogItem` schema already carries the fields the upgrade architecture needs:
  `service_tier`, `access_level` (**UI display/filter label only — no auth enforces
  it**, per SCOPE-LOCK), `kind: "product" | "content"`, `ttx_eligible`, `price`,
  `tags`, `compliance_tags` (non-certifying).
- Category registry (`src/pages/marketplace/categories.ts`): mission-packs,
  ttx-packs, ai-architect-kits, threat-intelligence-reports, governance-briefings, …

## 2. Pack families → catalog mapping

Marketplace upgrades are **catalog items, not new infrastructure**. Each pack family
maps onto the existing schema (`UpgradePackKind` in
`src/future/pearl/qualificationContract.ts`):

| Pack family | `kind` | Home category | `tags` (proposed) | Example |
|---|---|---|---|---|
| **Agent packs** | product | ai-architect-kits | `agent-pack` | Intake agent starter set |
| **Automation packs** | product | mission-packs | `automation-pack` | Workflow automation bundle |
| **Scenario packs** | content | ttx-packs | `scenario-pack` | TTX scenario collections (`ttx_eligible: true`) |
| **Intelligence packs** | content | threat-intelligence-reports / governance-briefings | `intelligence-pack` | Threat intel subscriptions |

`service_tier` on each item names the minimum tier it belongs with (`access`,
`operator`, `ops-division`, `enterprise`) — as a **display/filter value**. Real
entitlement enforcement requires auth-side work: deferred, Council-gated.

## 3. Tier ↔ marketplace relationship

- **ACCESS (free trial):** sees the full catalog; pack detail views carry an upgrade
  prompt instead of an acquire action.
- **OPERATOR:** acquires individual packs; the cockpit Marketplace becomes the
  operator's expansion surface.
- **OPS DIVISION:** pack acquisitions apply division-wide; scenario packs unlock the
  team TTX runtime (`/join` participants).
- **ENTERPRISE:** negotiated catalog (private items — `access_level` display value
  `enterprise`), plus intelligence-pack feeds.

Full ladder mechanics: UPGRADE-PATH.md.

## 4. Phasing (all future work)

| Phase | Work | Gate |
|---|---|---|
| M0 | Tag existing catalog items with pack-family `tags` + `service_tier` display values (data-only change in `worker/catalogData.ts`) | Normal review — display metadata only |
| M1 | Storefront filter rails by pack family + tier; upgrade prompts on detail modal (UI only, no entitlements) | Council sees copy; no structural block triggered |
| M2 | Capture: `cta_click:catalog-item-*` funnels feed `/api/flow/intelligence`; pack-interest becomes a QUALIFY signal (Option B: interest observed **after** capture, never gating entry) | Baseline from Track 3 capture |
| M3 | Entitlements + purchase flow | **BLOCKED** — new worker surfaces + persistence; needs R0 restoration + its own Council packet |

## 5. Boundary + scope-lock compliance

No purchase flow, no billing provider, no entitlement enforcement, no new worker
API, no persistence are proposed for implementation here. `compliance_tags` and
`access_level` remain non-certifying display metadata (SCOPE-LOCK.md). Option B
invariant: marketplace interest signals enrich already-captured leads; the catalog
never becomes a pre-capture qualification gate.

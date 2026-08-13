# MARKETPLACE-WIREFRAMES — upgrade-aware marketplace surfaces (planning)

**Status:** PLANNING ONLY — paper wireframes for the M1 phase of
[MARKETPLACE-INTEGRATION.md](MARKETPLACE-INTEGRATION.md). No entitlements, purchases,
or worker changes are implied. Option B: nothing here gates browsing behind
qualification. | **Date:** 2026-07-16

Voice: AURELIUS on all catalog surfaces (`--entity-aurelius` accents); OPERATOR
appears only inside upgrade-decision moments. Tokens annotated inline; every CTA
carries a `data-flow-cta` id.

## M1 — Storefront with pack-family rails (public, ACCESS view)

```
+--------------------------------------------------------------------------+
| MSH OPS Storefront                    [Operator login]                    |
|                                        data-flow-cta storefront-operator- |
|                                        login · border-op-border-bright    |
+--------------------------------------------------------------------------+
| ► AURELIUS · Interprets — browse the governed catalog; no account needed  |
|   (.entity-voice, --entity-aurelius-line/-veil)                           |
|                                                                           |
| PACK RAILS  (filter chips: border-op-border, active text-entity-aurelius) |
|  [All] [Agent packs] [Automation packs] [Scenario packs] [Intel packs]    |
|   data-flow-cta="storefront-rail-<family>"                                |
|                                                                           |
|  +-- .op-panel ------------+  +--------------------------+                |
|  | Threat Monitor Agent    |  | TTX Scenario Pack Vol.2  |                |
|  | kind: product           |  | kind: content ttx_eligible|               |
|  | tier chip: OPERATOR     |  | tier chip: OPS DIVISION  |                |
|  | (service_tier display,  |  |  text-op-text-dim,       |                |
|  |  non-enforcing)         |  |  border-op-border-bright)|                |
|  | data-flow-cta=          |  |                          |                |
|  |  "catalog-item-<id>"    |  |                          |                |
|  +-------------------------+  +--------------------------+                |
+--------------------------------------------------------------------------+
```

## M1 — Catalog detail modal with upgrade prompt (ACCESS view)

```
+-- CatalogDetailModal (.op-panel-raised) ---------------------------------+
|  Threat Monitor Agent            [product] [agent-pack]                   |
|  description · source · lastUpdated (explainability row, text-op-text-dim)|
|  compliance_tags: displayed as plain labels — non-certifying              |
|                                                                           |
|  ┌ upgrade prompt (border-left --entity-operator) ──────────────────────┐ |
|  | ► OPERATOR · Decides — acquiring packs requires the OPERATOR tier.   | |
|  |   [ VIEW UPGRADE PATH → ]  data-flow-cta="catalog-upgrade-<id>"      | |
|  |   (routes to pricing/upgrade page — no purchase flow exists)         | |
|  └───────────────────────────────────────────────────────────────────────┘ |
|                                                     [ Close ]             |
+--------------------------------------------------------------------------+
```

## M1 — Cockpit marketplace (OPERATOR view, auth-gated)

```
|  Breadcrumbs: Cockpit / Marketplace                                       |
|  h1 Marketplace (text-op-accent)          [Refresh]                       |
|  ► AURELIUS · Interprets — the catalog is read against your mission       |
|                                                                           |
|  MY PACKS rail (future: acquired packs; until entitlements land this is   |
|  a display-only shelf fed by catalog tags — no server state)              |
|                                                                           |
|  grid: as storefront, but detail modal shows "REQUEST ACQUISITION" mailto/|
|  intake handoff (existing /intake funnel) instead of a purchase flow      |
|   data-flow-cta="catalog-acquire-<id>"                                    |
```

## Tier ladder strip (shared component, pricing/upgrade page — future)

```
|  ACCESS ────► OPERATOR ────► OPS DIVISION ────► ENTERPRISE               |
|  (you are    seat command    team command       governed at scale        |
|   here ●)                                                                 |
|  segment fill: --entity-ghost (current) / --entity-aurelius (attained)    |
|  recommendation badge: BEACON voice ("ROUTE recommends: OPERATOR")        |
|  decision CTA: OPERATOR voice  data-flow-cta="upgrade-select-<tier>"      |
```

## Explicitly absent (blocked / future packets)

Purchase or checkout of any kind; entitlement checks; per-tier content hiding
(`access_level` stays a display filter); pack installation into the runtime; any new
worker endpoint. Acquisition intent is routed through the EXISTING intake funnel —
which also keeps the signal inside the Option B capture-first pipeline.

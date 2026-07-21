# UPGRADE-PATH — ACCESS → OPERATOR → OPS DIVISION → ENTERPRISE (planning)

**Status:** PLANNING ONLY. No billing, entitlements, tier enforcement, or worker
changes exist or are implemented by this document. Implementation is blocked until
R0 worker restoration + Council review. Option B (capture-first →
qualification-after) governs every step. | **Date:** 2026-07-16

## 1. The ladder

```
 ACCESS (free trial) ──► OPERATOR ──► OPS DIVISION ──► ENTERPRISE
   capture+experience      command       team command      governed at scale
   GHOST/BEACON voice      OPERATOR      OPERATOR          BEACON (compliance)
```

| Tier | Who | Gets | Marketplace posture | Lifecycle stage |
|---|---|---|---|---|
| **ACCESS** | Captured prospect (email + consent — Option B stage CAPTURED) | Public surfaces, catalog browsing, TTX join links (`/join`), diagnostic tools | Browse-all, acquire-none; upgrade prompts | CAPTURED → EXPERIENCE |
| **OPERATOR** | Individual operator | Cockpit (`/dashboard`, TTX suite, status), single-seat | Acquires agent/automation/scenario packs | QUALIFY → ROUTE → UPGRADE |
| **OPS DIVISION** | Team | Division-wide seats, shared TTX sessions, division telemetry | Packs apply division-wide | UPGRADE (recurring) |
| **ENTERPRISE** | Org | Negotiated catalog, intelligence-pack feeds, governance reporting | Private catalog lanes | UPGRADE (contracted) |

## 2. Option B applied to the ladder

1. **Capture before any gate.** The free trial *is* the capture mechanism: ACCESS
   requires only email + consent (existing `/api/register*` contract). No
   qualification questionnaire stands between a visitor and ACCESS.
2. **Experience before qualification.** Trial usage (surfaces seen, TTX joins,
   catalog interest via `catalog-item-*` clicks) produces qualification signals
   passively — the QUALIFY stage reads what EXPERIENCE already recorded.
3. **Routing is a recommendation, not a wall.** ROUTE proposes a tier
   (`recommendedTier`); the prospect can always take a lower tier. BEACON voices the
   recommendation; OPERATOR voices the decision.

## 3. Upgrade triggers (planned, measured via existing flow plane)

| Trigger (signal) | Suggested move | Signal source |
|---|---|---|
| Repeated cockpit-gated CTA clicks from ACCESS | ACCESS → OPERATOR | `cta_click:onboarding-enter-cockpit`, storefront login CTA |
| Scenario-pack interest + multi-participant joins | OPERATOR → OPS DIVISION | `catalog-item-*` (scenario packs), `/join` session sizes |
| Intelligence-pack interest + compliance-tag filtering | OPS DIVISION → ENTERPRISE | catalog filter usage, `intelligence-pack` clicks |

## 4. What must exist before implementation

1. **R0 worker restoration** (hard prerequisite; boundary condition).
2. Council-approved entitlement model (which checks run where — the current
   `access_level` field is display-only by scope-lock and must stay so until then).
3. Payment/billing decision (provider, invoicing) — entirely absent today; its own
   packet.
4. Tier state persistence — blocked (no runtime persistence until R0).

Until all four land, every tier behavior described here is presentation +
recommendation only.

# UPGRADE-ADVISOR — implementation record (Track 6)

**Status:** IMPLEMENTED | **Date:** 2026-07-16 | **Source:**
`worker/recommendationEngine.ts` (advisor projection), `src/pearl/upgradeAdvisor.tsx`

## 1. Advisor logic

The advisor is a projection of the recommendation focused on eligibility, returned as
the `advisor` field of `/api/recommendation/evaluate` (no separate endpoint):

```
advisor = { eligible, blockedBy: ("tier-prerequisite"|"entitlement-prerequisite")[],
            hint, voice: "beacon" }
```

- **tier-prerequisite** — current tier is below the recommendation, or a recommended
  pack sits above the subject's tier (latent).
- **entitlement-prerequisite** — the subject lacks `marketplace.acquire` (i.e. still
  on ACCESS).
- **hint** — plain-language explanation that always states the stay-put path
  ("ACCESS keeps browsing everything either way"; "latent, never lost, until you
  upgrade").

## 2. Option B enforcement

The advisor **never blocks**. `eligible` means "an upgrade would activate something,"
not "you are barred." Every hint names what upgrading unlocks AND that browsing/ACCESS
remains fully available. It surfaces prerequisites; it never gates the catalog.

## 3. UI

- **`AdvisorPanel`** — mounted on the operator Dashboard (`src/pages/Dashboard.tsx`).
  BEACON-voiced recommendation + pack status list + an OPERATOR-voiced action row
  ("the decision stays yours — advisor output is advisory"). The dashboard is an
  operator surface with **no PRISM mount** (capture policy R12); `data-flow-cta`
  attributes are present so the markup stays capture-ready but emit nothing there.
- **`AdvisorHint`** — rendered in the marketplace purchase modal's `blocked` state
  (`src/pearl/marketplacePurchase.tsx`), showing the tier a pack needs and confirming
  browsing stays open. Fetches evaluate with the anonymous sessionId.

Both consume only op-*/entity-* tokens; `upgradeAdvisor.tsx` is a lint-enforced voice
surface (R13; 14 surfaces total).

## 4. Verification

Advisor eligibility/blockedBy asserted in `tests/recommendationEngine.test.ts`;
typecheck + lint green; UI renders inside existing Dashboard and modal without layout
regressions (build assembles).

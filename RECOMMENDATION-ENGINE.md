# RECOMMENDATION-ENGINE — implementation record (Track 6)

**Status:** IMPLEMENTED | **Date:** 2026-07-16 | **Source:**
`worker/recommendationEngine.ts`

## 1. What it is

The governed autonomy core. `evaluateRecommendation(inputs)` is a **pure, advisory**
function — it reads the Track 5 runtimes and produces a recommendation; it mutates
nothing. Grants and tier changes only ever come from their own single-writer paths.

**Inputs:** `{ stage, evidence, tier, resolved entitlements, packItems }` — assembled
by `assembleRecommendation()` from `readTier`, `resolveEntitlements`,
`readQualificationSnapshot`, and the pack-tagged catalog (`packItemsFromCatalog`).

**Output:** `{ recommendedTier, recommendedPacks[], nextAction, voice, justification,
advisor }`.

## 2. Logic

- **recommendedTier** — wizard `upgrade_decision(accept)` tier > `route_shown` tier >
  heuristic (`team_size==="org"` → ops-division; any post-CAPTURED stage → operator;
  else access). Clamped so it is **never below the subject's current tier**.
- **recommendedPacks** — catalog pack-family items matching the `objective` answer
  (`OBJECTIVE_PACKS`: security → intelligence/scenario, efficiency → automation,
  integration → automation/agent, ai-build → agent), each annotated
  `held | eligible | needs-tier` against the resolved entitlements + current tier.
- **nextAction** ladder — `continue-onboarding` (null/CAPTURED) → `explore-experience`
  (EXPERIENCE) → `refine-blueprint` (QUALIFY, no route) → `upgrade-tier`
  (tier below recommendation or a gated pack) → `acquire-pack` (eligible pack) →
  `enter-cockpit` (accepted at sufficient tier).
- **voice + justification** — entity per EMOTIONAL-ARC: AURELIUS interprets, GHOST
  adapts, BEACON recommends, OPERATOR decides; one evidence-grounded sentence.

## 3. Endpoint

`POST /api/recommendation/evaluate` `{ captureId?, sessionId?, subject? }` — public;
subject resolution matches the tier worker (operator JWT handle → `anon:<uuid>` →
`anonymous`). Registered in `apiAuth.ts` allow-list + `routeClass.ts` public list.
Returns `{ subject, tier, stage, ...recommendation }`.

## 4. Doctrine

**Option B (unit-tested):** a subject with no capture always resolves to
`continue-onboarding` at ACCESS — never a wall; the engine never blocks browsing;
output carries no mutation surface (pure data). Recommendations are advice the
OPERATOR acts on, not commands.

## 5. Tests

`tests/recommendationEngine.test.ts` — Option B invariants, never-below-current-tier,
tier/pack/nextAction matrix (wizard-decision precedence, org heuristic, objective→pack
mapping with tier-aware status, held-pack suppression, accepted→enter-cockpit),
advisor eligibility. `tests/autonomyRoutes.test.ts` covers the endpoint.

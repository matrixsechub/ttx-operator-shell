# BLUEPRINT-GENERATOR — implementation record (Track 6)

**Status:** IMPLEMENTED | **Date:** 2026-07-16 | **Source:**
`worker/blueprintGenerator.ts`

## 1. What it produces

`GET /api/blueprint?captureId=…[&sessionId=…]` assembles the durable operator
blueprint for a captured prospect. It is a **read** — derived entirely from
qualification evidence + the advisory recommendation engine; it mutates nothing.

```
blueprint = {
  mission:          latest route_shown.recommendedPath  (or null pre-route)
  objective:        latest answer(objective)            (or null)
  recommendedPacks: from the recommendation engine (tier-aware status)
  recommendedTier:  from the recommendation engine
  nextSteps:        string[] keyed off the engine's nextAction
}
```

## 2. Consumption model

- Public, capture-anchored (same contract as `GET /api/qualification/state`):
  - `404` for an unknown capture (no lifecycle to blueprint).
  - `{ blueprint: null, nextSteps: [onboarding steps], voice: "aurelius" }` when the
    capture exists but has no folded stage yet (Option B: capture-only prospects get
    an onboarding blueprint, never a blank/blocked one).
- The wizard keeps its local `recommendPath` for step-4 display; the server blueprint
  is the durable artifact the cockpit/advisor read. Wiring the wizard to fetch it is a
  future refinement, out of Track 6 scope.

## 3. Inputs it consumes (per mandate)

Wizard blueprint (route_shown evidence) + qualification evidence (answers) +
entitlements (via the engine's tier-aware pack status) — all through
`readQualificationSnapshot` + `assembleRecommendation`, so blueprint and advisor can
never diverge.

## 4. Tests

`tests/autonomyRoutes.test.ts` — full-evidence assembly (mission/objective/tier/next
steps) and unknown-capture 404.

# MARKETPLACE-INTENT — implementation record (Track 6)

**Status:** IMPLEMENTED | **Date:** 2026-07-16 | **Source:**
`worker/marketplaceIntentRouter.ts`

## 1. What it does

`POST /api/marketplace/intent` turns a visitor's intent plus the recommendation
engine's output into ONE governed navigation route. It never mutates tier or grants —
routing is advisory navigation.

**Request:** `{ intent: "acquire"|"upgrade"|"refine"|"continue", itemId?, captureId?,
sessionId?, subject? }` (public, validated).

## 2. Routing table

| Intent | Condition | Route | Voice |
|---|---|---|---|
| acquire | itemId is a pack + tier suffices | `m3-purchase` (target = itemId) | AURELIUS |
| acquire | itemId is a pack + tier gated | `tier-upgrade` (requiresTier = pack min) | BEACON |
| acquire | no/invalid itemId | 400 / 404 | — |
| upgrade | — | `tier-upgrade` (target = recommendedTier) | BEACON |
| refine | — | `blueprint-refinement` (target = /onboarding) | AURELIUS |
| continue | — | `onboarding-continuation` (target = /onboarding) | AURELIUS |
| any non-acquire | no captureId | `onboarding-continuation` (Option B) | AURELIUS |

## 3. Option B integration

- **No capture → onboarding** for every non-acquire intent (a plain eligible acquire
  needs no lifecycle). Capture always precedes qualification.
- When a `captureId` is present, the intent is recorded as qualification evidence
  (`answer` kind, questionId `marketplace_intent`, value `<intent>` or
  `<intent>:<itemId>`) via the qualification runtime's own validated path — interest
  becomes a QUALIFY signal, exactly as CONVERSION-MEMO/Track 4 specified. Verified in
  tests: a `refine` intent with capture advances the lifecycle to QUALIFY.
- The catalog is never locked by an intent; `tier-upgrade` responses restate that
  browsing stays open.

## 4. Notification

Every routed intent emits a `marketplace-intent` operator notification
`{ intent, itemId, route }` (asserted present in the ring log by the test suite).

## 5. Tests

`tests/autonomyRoutes.test.ts` — acquire eligible/gated split, evidence recording +
stage advance to QUALIFY + notification, no-capture → onboarding continuation.

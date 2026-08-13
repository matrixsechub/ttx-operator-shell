# AUTONOMY-LAYER — Track 6 summary

**Status:** IMPLEMENTED (implementation workstreams) + PLANNED (multi-account /
division) | **Date:** 2026-07-16 | **Branch:** `claude/pearl-spectral-track-1-f2tyil`

Track 6 activates governed autonomy on the Track 5 runtimes. All of it is advisory and
Option-B-compliant: the autonomy layer recommends, routes, and notifies — it never
mutates tier or grants (those keep their single-writer paths) and never blocks ACCESS.

## 1. Shipped (implementation)

| Workstream | Surface | Record |
|---|---|---|
| Recommendation engine | `POST /api/recommendation/evaluate` (`worker/recommendationEngine.ts`) | [RECOMMENDATION-ENGINE.md](RECOMMENDATION-ENGINE.md) |
| Upgrade advisor | advisor projection + `AdvisorPanel`/`AdvisorHint` (`src/pearl/upgradeAdvisor.tsx`) | [UPGRADE-ADVISOR.md](UPGRADE-ADVISOR.md) |
| Marketplace intent router | `POST /api/marketplace/intent` (`worker/marketplaceIntentRouter.ts`) | [MARKETPLACE-INTENT.md](MARKETPLACE-INTENT.md) |
| Blueprint generator | `GET /api/blueprint` (`worker/blueprintGenerator.ts`) | [BLUEPRINT-GENERATOR.md](BLUEPRINT-GENERATOR.md) |
| Operator notifications | `notifyOperator` + `GET /api/notifications/recent` (`worker/operatorNotifications.ts`) | [OPERATOR-NOTIFICATIONS.md](OPERATOR-NOTIFICATIONS.md) |

## 2. Planned (blocked on the account model)

| Workstream | Record |
|---|---|
| Multi-account model | [MULTI-ACCOUNT-MODEL.md](MULTI-ACCOUNT-MODEL.md) |
| Division-scoped enforcement | [DIVISION-ENFORCEMENT.md](DIVISION-ENFORCEMENT.md) |

## 3. Doctrine posture

- **Advisory-only autonomy:** the engine/router/blueprint are pure reads over
  evidence + tier + entitlements; the only writes are (a) qualification evidence the
  intent router records (interest as a QUALIFY signal, Option B) and (b) operator
  notifications. No grant or tier mutation anywhere in the layer.
- **Option B intact:** no capture → onboarding continuation; recommendation never
  below current tier; every tier hint restates that browsing stays open; ACCESS is
  never walled.
- **Entity hierarchy:** AURELIUS interprets, GHOST adapts, BEACON recommends, OPERATOR
  decides — carried on every recommendation/route/advisor response and rendered by the
  advisor UI.
- **Capture policy:** advisor UI mounts on the operator dashboard (no PRISM) and the
  public marketplace modal (PRISM already present); notification egress is a
  sanctioned, HMAC-signed, env-gated channel distinct from growth capture (R15
  untouched).
- **Governed egress:** no operator notification leaves the worker unless
  `N8N_NOTIFY_WEBHOOK_URL` is configured; otherwise KV ring log + console only.

## 4. Storage (all existing `TTX_STATE` KV)

New key: `pearl:notifications:log` (ring, 50 items, 7d TTL). No new namespaces; all
other reads reuse Track 5 keys.

## 5. New API surfaces

`POST /api/recommendation/evaluate` (public), `POST /api/marketplace/intent` (public),
`GET /api/blueprint` (public), `GET /api/notifications/recent` (operator-gated). All
registered in `apiAuth.ts` + `routeClass.ts`; the notifications reader stays
default-deny.

## 6. Verification

`npm run lint:brand` green (R1–R15; 14 voice surfaces) · typecheck clean · **174/174
tests** (18 new: recommendation engine matrix + autonomy endpoints incl. notification
ring-log and no-egress-when-unconfigured) · `npm run build` assembles. Not deployed.

## 7. Follow-up

The account model (MULTI-ACCOUNT-MODEL.md) is the single prerequisite unblocking
division-scoped enforcement, multi-tenant billing, seat counting, and real
`access_level` lanes — recommended as the next track's foundation.

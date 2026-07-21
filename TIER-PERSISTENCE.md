# TIER-PERSISTENCE — implementation record (Track 5)

**Status:** IMPLEMENTED | **Date:** 2026-07-16 | **Contract:** UPGRADE-PATH.md

## What shipped (`worker/tierWorker.ts`)

- KV-persisted subscription tier per subject: `pearl:tier:<subject>` in `TTX_STATE`.
- Ladder validated on write: `access → operator → ops-division → enterprise`.
- **Unknown subjects resolve to `access`** — Option B: the free trial is the capture
  mechanism; nobody is tierless, and anonymous visitors always hold the ACCESS
  baseline.

| Endpoint | Auth | Behavior |
|---|---|---|
| `GET /api/tier/get` | public | Tier for current subject (operator JWT → handle; `?sessionId=<uuid4>` → `anon:<id>`; else `anonymous`). Returns the ladder for UI rails. |
| `POST /api/tier/set` | operator JWT (default-deny gate + in-handler check) | `{subject?, tier}` — returns previous tier for audit trails |

## Integration

- `entitlementsWorker.readTier` feeds tier into every entitlement resolution.
- Billing checkout enforces tier via the resolved set (see
  ENTITLEMENTS-IMPLEMENTATION.md §3).
- The wizard's UPGRADE decision records tier intent as qualification evidence;
  actual tier changes remain an operator-authorized write (`/api/tier/set`) or a
  future billing-settled subscription — self-serve tier purchase is a follow-up
  packet (subscription-mode checkout).

## Tests

`tests/entitlements.test.ts` (tier read/write/default + endpoint auth) and
`tests/billingWorker.test.ts` (tier gating of acquisitions).

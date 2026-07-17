# QUALIFICATION-ENGINE — implementation record (Track 5)

**Status:** IMPLEMENTED | **Date:** 2026-07-16 | **Contract:**
QUALIFICATION-RUNTIME.md (Track 4), `src/pearl/qualificationContract.ts`

## 1. Architecture

```
evidence (append-only, KV)  ──►  resolveStage() pure fold  ──►  { stage, voice, payload }
        ▲                              (the only authority)             │
        │                                                               ▼
  POST /api/qualification/evidence                        GET /api/qualification/state
```

- **`src/pearl/qualificationMachine.ts`** — the pure executor: `resolveStage(evidence)`
  folds CAPTURED → EXPERIENCE → QUALIFY → ROUTE → UPGRADE with per-transition
  guards (`STAGE_GUARDS`). No I/O, no clock, no randomness; stage is always
  recomputable from evidence alone. The persisted snapshot is a cache, never truth.
- **`worker/qualificationRuntime.ts`** — evidence persistence + HTTP surface. KV key
  `pearl:qualification:<registerId>` in `TTX_STATE`, 90-day TTL, 200-item cap.

## 2. Guards + evidence gates (as shipped)

| Transition | Gate |
|---|---|
| → CAPTURED | consented `capture_confirmed` anchored on a REAL register record (`findRegisterCapture` — accepts register_id or lookup id; synthesized at first evidence write, timestamped at registration) |
| → EXPERIENCE | ≥1 `surface_visit` after the anchor |
| → QUALIFY | ≥1 `answer` with a questionId |
| → ROUTE | `route_shown` with path + tier |
| → UPGRADE | `upgrade_decision` (accept/downgrade/defer) |

Enforced properties (unit-tested in `tests/qualificationMachine.test.ts` +
`tests/qualificationRuntime.test.ts`): **no skipping** (later evidence without earlier
gates does not advance), **no regression** (fold stops at first failed guard),
**no retroactive qualification** (evidence before the capture anchor is inadmissible),
**Option B structural** (no capture → `stage: null`, no lifecycle).

## 3. Validation + hardening

Server-assigned timestamps (clients cannot backdate); per-kind payload whitelists
with length caps; captureId format + existence checks (404 on unknown captures);
UUID-validated optional sessionId; standard rate limits; public routes registered in
`apiAuth.ts` + `routeClass.ts`.

## 4. Entity voice bindings

`STAGE_VOICE` rides every state response (`voice` field): CAPTURED/QUALIFY →
aurelius, EXPERIENCE → ghost, ROUTE → beacon, UPGRADE → operator. The wizard renders
the voice it is told, keeping the emotional arc server-consistent.

## 5. Known limits

- Evidence is client-reported (validated + anchored, but a motivated client can
  fabricate `surface_visit` items). Signals feed recommendations, never entitlements —
  grants only ever come from the billing single-writer.
- `answer` items accumulate; the fold takes the latest per questionId.

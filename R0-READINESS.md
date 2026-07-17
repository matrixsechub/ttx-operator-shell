# R0-READINESS — what R0 unblocks, and what still gates each item

**Status:** R0 worker restoration LANDED (this branch — see
[WORKER-RESTORE.md](WORKER-RESTORE.md)). This document is the gate map for everything
that was waiting on it. | **Date:** 2026-07-16

## 1. What R0 delivered

- Verified-healthy restored surfaces: `/api/register*`, `/api/flow/event`,
  `/api/marketplace/catalog` (wired, validated, KV-backed where applicable).
- Rogue debug capture plane purged from worker + client (7 sites); capture policy now
  lint-enforced (R15, CI-gated).
- Guaranteed `{ error }` envelope on every request path (top-level catch) with
  structured, secret-free error logging.
- Full gates green: lint R1–R15, typecheck, 120/120 tests, build.

## 2. Unblock map

| Item | Was blocked on | Still gated by |
|---|---|---|
| Structural funnel rebuild (mission-path picker, `/enter` wizard mount of Track 3 primitives) | R0 ✅ | **Council review of Track 2 Phase 2** (REBUILD-PLAN.md) |
| Onboarding checklist logic (derive status from register/wizard data) | R0 ✅ | Council review (ONBOARDING-SCAFFOLD.md) |
| Qualification runtime (evidence fold over flow + register records) | R0 ✅ | Council packet per QUALIFICATION-RUNTIME.md §6; evidence-reader endpoint decision |
| Entitlement enforcement (`access_level` becomes real) | R0 ✅ | **Account model packet** (single-operator JWT today) + ENTITLEMENT-MODEL approval |
| Marketplace M3 (purchase flow P2–P4) | R0 ✅ | Billing decision (BILLING-PACKET.md) + new-endpoint approvals + account model |
| Pearl-light visual theme on funnel | never worker-gated | Council review of Track 2 Phase 1 |
| M3 P0–P1 scaffolds (grant-template table, acquisition UI states) | R0 ✅ | Design review only — first candidates for the next track |

## 3. Standing invariants (unchanged by R0)

Option B: capture-first → qualification-after. Boundary until Council rules: no
mission-path picker, no multi-step wizard logic, no checklist logic, no new worker
API surfaces, no qualification executor, no entitlement runtime, no purchase flow,
no runtime persistence beyond what exists. Doctrine: token discipline (R1–R11),
capture policy (R12–R15), entity hierarchy (SURFACE-IDENTITY-MAP.md), emotional arc
(EMOTIONAL-ARC.md).

## 4. Recommended next-track order

1. Council session: Track 2 Phase 2 approval + billing decision (two decisions, one sitting).
2. Account model design packet (longest lead item; prerequisite for entitlements AND billing).
3. M3 P0–P1 scaffolds + wizard mount behind approval.
4. Qualification evidence-reader design (reuse `/api/flow/intelligence` if possible —
   avoids a new endpoint).

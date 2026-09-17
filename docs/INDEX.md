# Document Index — root-level Markdown

**Date:** 2026-09-17 · **Task:** 6 of `docs/BUDGET-EXECUTION-PLAN.md`

Every `*.md` at the repository root, classified so a future session can skip dead context. **Nothing was moved or deleted.** Status is derived from each file's own `**Status:**` / `**Generated:**` line plus `SCOPE-LOCK.md`.

| Status | Meaning | Read it? |
|---|---|---|
| **GOVERNING** | Currently binding on how work is done | Always |
| **RECORD** | Accurate description of shipped work, past tense | When touching that subsystem |
| **PLANNING** | Contract or design for work not implemented | Only when starting that work, and check the scope lock first |
| **RETIRED-SCOPE** | Planning for something `SCOPE-LOCK.md` explicitly retires | Do not treat as approved work |
| **HISTORICAL** | Point-in-time review, superseded by later docs | Only for provenance |

## GOVERNING (5)

| File | Purpose |
|---|---|
| `CLAUDE.md` | Repo operating guide: commands, layout, tests, governance posture |
| `AGENTS.md` | Agent roster (ARCH-01, SEC-01, QA-01) and standing doctrine |
| `SCOPE-LOCK.md` | Retired vs real scope; enforcement checklist for any new phase document |
| `README.md` | Stack, surfaces table, build and deploy commands |
| `ROLLBACK.md` | Wrangler deployment rollback procedure |

## RECORD (19)

Implementation records and doctrine describing work already in the tree. Dated 2026-07-16 unless noted.

| File | Subsystem |
|---|---|
| `WORKER-RESTORE.md` | R0 worker restoration (Track 4) |
| `STRUCTURAL-REBUILD.md` | Track 5 summary |
| `AUTONOMY-LAYER.md` | Track 6 summary (partly PLANNED: multi-account) |
| `OS-CONFORMANCE-EXPANSION.md` | Track 3 conformance |
| `ENTITLEMENTS-IMPLEMENTATION.md` | Entitlements runtime |
| `QUALIFICATION-ENGINE.md` | Qualification engine |
| `TIER-PERSISTENCE.md` | Tier persistence |
| `MARKETPLACE-M3-IMPLEMENTATION.md` | Acquisition runtime, Stripe-ready plus sandbox |
| `MARKETPLACE-INTENT.md` | Marketplace intent router |
| `RECOMMENDATION-ENGINE.md` | Recommendation engine |
| `UPGRADE-ADVISOR.md` | Upgrade advisor |
| `BLUEPRINT-GENERATOR.md` | Blueprint generator |
| `OPERATOR-NOTIFICATIONS.md` | Operator notifications |
| `WIZARD-IMPLEMENTATION.md` | Onboarding wizard |
| `SPA-CAPTURE.md` | SPA capture |
| `SURFACE-IDENTITY-MAP.md` | Live entity-voice cue assignments per surface |
| `EMOTIONAL-ARC.md` | Doctrine; the cues it describes are live |
| `RELEASE-NOTES-TRACK6.md` | Track 6 release notes |
| `R0-READINESS.md` | What R0 unblocked and what still gates each item |

## PLANNING (11)

Self-declared "PLANNING ONLY" or "SCAFFOLD ONLY". No runtime depends on them.

| File | Defines |
|---|---|
| `BILLING-PACKET.md` | Council billing decision packet |
| `CONVERSION-MEMO.md` | Funnel ordering, Option A vs B |
| `DIVISION-ENFORCEMENT.md` | Division enforcement rules |
| `ENTITLEMENT-MODEL.md` | Tiers, packs, resolution rules |
| `UPGRADE-PATH.md` | ACCESS → OPERATOR → OPS DIVISION → ENTERPRISE |
| `MARKETPLACE-INTEGRATION.md` | Subscription and upgrade architecture |
| `MARKETPLACE-M3.md` | Acquisition runtime definition |
| `MARKETPLACE-WIREFRAMES.md` | M1 paper wireframes |
| `WIREFRAMES.md` | Pearl-Spectral Track 2 target surfaces |
| `QUALIFICATION-RUNTIME.md` | Qualification runtime contract |
| `REBUILD-PLAN.md` | Pearl-Spectral Track 2 rebuild |
| `ONBOARDING-SCAFFOLD.md` | Activation checklist primitives (scaffold) |
| `WIZARD-SCAFFOLD.md` | Wizard primitives and qualification contract (scaffold) |

## RETIRED-SCOPE (2)

Planning documents for concepts `SCOPE-LOCK.md` lists under "RETIRED — do not treat as real". Keep for provenance; do not schedule work from them without an Operator mission that amends the scope lock.

| File | Retired concept it plans |
|---|---|
| `MULTI-ACCOUNT-MODEL.md` | "Multi-operator identity model, operator tiers, UUID operator identity, MFA enforcement" |
| `MULTI-ACCOUNT-MIGRATION.md` | Rollout sequencing for the same |

## HISTORICAL (9)

All generated 2026-07-01, before the scope lock took effect the same day. Useful for provenance only; `SCOPE-LOCK.md` supersedes their framing.

`SYNTHESIS-LAYER-REPORT.md`, `PRIORITIZED-BUILD-PLAN.md`, `OPERATIONAL-REPORT.md`, `OPERATIONAL-REPORT-CONDENSED.md`, `PHASE9-SYNTHESIS-REVIEW.md`, `PHASE10-SYNTHESIS-REVIEW.md`, `PHASE10-BLUEPRINT-ALIGNMENT-REVIEW.md`, `PHASE10-CORRECTION-CONFIRMATION.md`, `PHASE11-KICKOFF-SYNTHESIS-REVIEW.md`.

**Known stale claims in this set** (verified against the current tree, 2026-09-17): `PRIORITIZED-BUILD-PLAN.md` states "Zero test coverage" and "Auth/session layer currently fully implicit (browser context = identity)". Both are false today: `npm test` runs 304 tests across 92 suites, and `worker/auth.ts` implements PBKDF2 credentials with signed tokens. Do not plan from that document.

## Scope-lock tensions found while indexing

1. **Auth/session** (already recorded in `CLAUDE.md` and `docs/security/AUTH-SESSION-REVIEW.md` F16). `SCOPE-LOCK.md` retires "backend auth/session layer"; the repo ships and tests one.
2. **Billing, entitlements, and tiers** (new here). `SCOPE-LOCK.md` retires "backend marketplace delivery flows (content delivery pipelines, purchase/onboarding flows)" and "SKU tracking", and its REAL list names no billing runtime. Yet `worker/marketplaceBillingWorker.ts`, `worker/entitlementsWorker.ts`, and `worker/tierWorker.ts` exist, are routed from `worker/index.ts`, and are covered by `tests/billingWorker.test.ts` and `tests/entitlements.test.ts`. `MARKETPLACE-M3-IMPLEMENTATION.md` records this as shipped "per Council billing decision". **Operator decision required:** amend the scope lock to reflect the shipped billing runtime, or issue a retirement mission. Until then, treat the code as real and do not extend billing scope.

## Related documents outside the root

- `docs/BUDGET-EXECUTION-PLAN.md` — current work plan
- `docs/ARCHITECTURE.md` — worker architecture, gates, failure modes
- `docs/TEST-BASELINE.md` — test baseline and orphan-suite classifications
- `docs/security/AUTH-SESSION-REVIEW.md` — 17 security findings
- `docs/security/F1-F3-OPERATOR-DECISION.md` — F1 remediated, F3 pending
- `docs/RELEASE.md`, `docs/STAGING_EXECUTION.md`, `docs/STEP5-RECONCILIATION.md`, `docs/evidence/`, `docs/flywheel/` — release and evidence trail

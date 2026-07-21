# MULTI-ACCOUNT-MIGRATION — rollout sequencing (planning)

**Status:** PLANNING ONLY — no migration is executed by this document. Prerequisite
for [DIVISION-ENFORCEMENT.md](DIVISION-ENFORCEMENT.md), which stays **blocked until
this migration completes**. Requires explicit go-ahead + a rollback plan (both below)
before any step runs. | **Date:** 2026-07-16

## 0. Storage reality

Persistence is **Cloudflare Worker KV** (`TTX_STATE`), not a relational DB. "Migration"
here means **rekeying** and introducing a `subject → accountId` resolver — there are no
SQL tables, no schema DDL, and validation is done by KV `list()` prefix scans, not
queries. KV has no transactions; every step must be idempotent and reversible by key
coexistence (old and new keys live side by side until cutover).

## 1. Target keying (from MULTI-ACCOUNT-MODEL.md)

| Track 5/6 key | Post-migration |
|---|---|
| `pearl:tier:<subject>` | `pearl:tier:<accountId>` (+ `pearl:division:<divisionId>:tier`) |
| `pearl:entitlements:<subject>` | `pearl:entitlements:<accountId>` (+ `pearl:division:<divisionId>:entitlements`) |
| `pearl:qualification:<registerId>` | unchanged (capture-anchored, pre-account) |
| `pearl:acquisition:<uuid>` | add `accountId` + `divisionId` fields (no rekey) |

## 2. Phased rollout (zero-downtime, dual-read/dual-write)

Each phase is independently deployable and reversible.

- **P0 — Resolver shim (no data change).** Introduce the Account entity + a
  `subject → accountId` resolver where every existing subject maps 1:1 to a
  single-member account (`accountId === subject`). All reads/writes still hit the old
  keys. Behavior identical. *Reversible: remove the shim.*
- **P1 — Dual-write.** Writes go to BOTH old (`:<subject>`) and new (`:<accountId>`)
  keys; reads still prefer old. *Reversible: stop writing new keys; old remains
  authoritative.*
- **P2 — Backfill.** One-off pass: `list()` each `pearl:tier:*` / `pearl:entitlements:*`
  prefix, write the new-keyed copy for any missing accountId. Idempotent (skip if new
  key exists). *Reversible: new keys are additive; delete them to undo.*
- **P3 — Read cutover.** Reads prefer new keys, fall back to old. Dual-write continues.
  *Reversible: flip the read preference back.*
- **P4 — Division scope.** Add `divisionId` to records; `resolveEntitlements` unions
  personal + division packs (DIVISION-ENFORCEMENT §2). Member identity plane +
  member route class land here.
- **P5 — Decommission old keys.** Only after a full retention window (≥ the 90-day KV
  TTLs) with zero old-key reads observed. *Point of no easy return — gated separately.*

## 3. Validation (KV prefix scans, run read-only before each cutover)

- **Coverage:** every `pearl:tier:<subject>` has a matching `pearl:tier:<accountId>`
  (P2 exit). Count(old) == Count(new) for tier and entitlements prefixes.
- **Integrity:** for a sample of accounts, resolved effective set is byte-identical
  under old-key read vs new-key read (P3 gate).
- **Idempotence:** re-running the backfill produces zero new writes.
- **No orphans:** every new `:<accountId>` key resolves back to a known subject.

## 4. Rollback

- P0–P3 are reversible by configuration (read/write preference flags) with old keys
  intact — rollback is a flag flip + redeploy, no data restore needed.
- P4 rollback disables division union (falls back to personal-only resolution).
- P5 is the only destructive step; do NOT run until a separate sign-off. Keep a KV
  export/snapshot of the deleted prefixes before P5.

## 5. Downtime

None expected. Every phase is dual-path; the worker never loses read access to
authoritative data. No maintenance window required for P0–P4.

## 6. Gating checklist (all required before P4 enforcement)

- [ ] Council approval of the account model (MULTI-ACCOUNT-MODEL.md).
- [ ] Explicit go-ahead for this migration + acknowledged rollback plan.
- [ ] P0–P3 shipped and validated (coverage + integrity + idempotence green).
- [ ] Member identity plane + member route class reviewed (security sign-off).
- [ ] KV snapshot taken before any P5 decommission.
- [ ] DIVISION-ENFORCEMENT remains disabled until all above are checked.

**DIVISION-ENFORCEMENT is blocked until this migration reaches P4 with validation
green.**

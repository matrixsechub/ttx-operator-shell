# DIVISION-ENFORCEMENT — enforcement rules (planning)

**Status:** PLANNING ONLY — no implementation. Depends on
[MULTI-ACCOUNT-MODEL.md](MULTI-ACCOUNT-MODEL.md); nothing here can ship until that
account model lands. | **Date:** 2026-07-16

## 1. Scope

Enforcement rules for the two team/org tiers and the pack families that require
division scope, once accounts and divisions exist.

## 2. Resolution rule extension

Track 5's per-subject rule:

```
effective(subject) = baseline(tier) ∪ personalPacks − revocations
```

extends to account+division:

```
effective(account) = baseline(tier(account))
                     ∪ personalPacks(account)
                     ∪ divisionPacks(account.divisionId)   // only if account.divisionId set
                     − revocations(account)
                     − divisionRevocations(account.divisionId)
```

Deny-by-default and latent-grant semantics carry over unchanged.

## 3. Tier enforcement

| Tier | Enforcement |
|---|---|
| **OPS DIVISION** | `division.seats` gates member count against a division seat cap; `division.telemetry` unlocks aggregate views; scenario/intelligence packs acquired by the division apply to all members (divisionPacks) |
| **ENTERPRISE** | adds `catalog.private-lanes` — items with `access_level: "enterprise"` become REAL access control (today display-only per SCOPE-LOCK), filtered at the catalog surface by division tier; `intel.feeds` subscriptions scoped to the division |

## 4. Pack families requiring division scope

| Family | Personal (operator) | Division (ops-division+) |
|---|---|---|
| agent-pack | per-account grant | optional division-wide |
| automation-pack | per-account grant | optional division-wide |
| scenario-pack | per-account | **division-wide** — unlocks the team TTX runtime (`/join` participants share division scenarios) |
| intelligence-pack | — (min tier ops-division) | **division-wide** feed |

## 5. Multi-account interaction matrix

| Actor | On personal entitlement | On division entitlement |
|---|---|---|
| operator (division admin) | read/write own | read/write division (set/grant/revoke) |
| member | read/write own | read-only (inherits) |
| anonymous prospect | ephemeral account, ACCESS baseline | none |

Grants remain single-writer (billing settle); division grants write to
`pearl:division:<id>:entitlements` with the same idempotency guarantees.

## 6. Enforcement points

- Edge gate (`worker/edge/gate.ts`) — member vs operator route class.
- `resolveEntitlements` (extended) — the union above; the billing acquire check
  (`marketplace.acquire`) already reads the resolved set, so it inherits division
  scope for free once the resolver unions division packs.
- Catalog surface — `access_level` filtering becomes real for enterprise lanes.

## 7. Blocked-until

All of the above requires: the Account/division entities, the member identity plane,
and the tenancy-keyed KV migration — i.e. the full MULTI-ACCOUNT-MODEL. Until then,
`service_tier`/`access_level` stay display-only (SCOPE-LOCK) and enforcement remains
per-subject (Track 5).

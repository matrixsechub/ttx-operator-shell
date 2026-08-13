# ENTITLEMENT-MODEL — tiers, packs, and resolution rules (planning)

**Status:** PLANNING ONLY — no persistence, no runtime, no purchase flow. Nothing in
this document is implemented; `access_level`/`service_tier` remain display-only
metadata per SCOPE-LOCK until Council approves an enforcement packet. |
**Date:** 2026-07-16 | **Companions:** [UPGRADE-PATH.md](UPGRADE-PATH.md),
[MARKETPLACE-M3.md](MARKETPLACE-M3.md), [BILLING-PACKET.md](BILLING-PACKET.md)

## 1. Model shape

An account's **effective entitlement set** is resolved, never stored:

```
effective(account) = baseline(tier) ∪ grants(packs) − revocations
```

- **Deny-by-default:** anything not in the effective set is denied.
- **Tiers are baselines, packs are deltas.** A pack never substitutes for a tier —
  packs *extend* the tier's baseline and may declare a `minimumTier`.
- **Resolution is pure:** given (tier, packs[], revocations[]) the result is
  deterministic — no I/O in the resolver. This keeps the future implementation
  testable and keeps entitlement checks out of hot paths that lack the inputs.

## 2. Tier baselines

Capability keys are namespaced `surface.verb` and map onto surfaces that exist today.

| Capability | ACCESS | OPERATOR | OPS DIVISION | ENTERPRISE |
|---|---|---|---|---|
| `public.browse` (funnel, storefront, catalog) | ✓ | ✓ | ✓ | ✓ |
| `ttx.join` (participant via `/join`) | ✓ | ✓ | ✓ | ✓ |
| `cockpit.enter` (`/dashboard`, status, TTX suite) | — | ✓ | ✓ | ✓ |
| `ttx.host` (create/run sessions) | — | ✓ | ✓ | ✓ |
| `marketplace.acquire` (pack acquisition) | — | ✓ | ✓ | ✓ |
| `division.seats` (multi-seat, shared sessions) | — | — | ✓ | ✓ |
| `division.telemetry` (aggregate views) | — | — | ✓ | ✓ |
| `catalog.private-lanes` (`access_level: enterprise` items) | — | — | — | ✓ |
| `intel.feeds` (intelligence-pack subscriptions) | — | — | — | ✓ |

## 3. Pack grants

| Pack family (`UpgradePackKind`) | Grants | `minimumTier` | Scope |
|---|---|---|---|
| `agent-pack` | `agents.<pack-slug>.use` | operator | per-seat |
| `automation-pack` | `automations.<pack-slug>.use` | operator | per-seat |
| `scenario-pack` | `ttx.scenarios.<pack-slug>` | operator (division-wide at ops-division) | seat or division |
| `intelligence-pack` | `intel.<pack-slug>.read` | ops-division | division/org |

## 4. Resolution rules

1. Compute `baseline(tier)` from §2.
2. For each held pack: reject the grant if `tier < minimumTier` (grant is **latent**,
   not lost — it activates on upgrade; this makes downgrades non-destructive).
3. Union active grants with the baseline; apply explicit revocations last.
4. Ties/conflicts: **most-specific key wins; deny beats allow** at equal specificity.
5. Anonymous / captured-but-unregistered visitors resolve to the ACCESS baseline —
   Option B: capture never gates browsing.

## 5. What implementation will require (all blocked pending Council)

- **Persistence:** tier + pack holdings per account (KV keyed by operator identity;
  DO if per-division consistency is needed). None exists today — the current worker
  has a single-operator JWT auth model (`worker/auth.ts`), so *the account model
  itself* is a prerequisite (see BILLING-PACKET.md §4).
- **Enforcement points:** the edge gate (`worker/edge/gate.ts` route classes) is the
  natural seam — entitlement check after token verification. Catalog filtering by
  `access_level` becomes real only then.
- **Non-goals here:** billing (BILLING-PACKET.md), purchase flow (MARKETPLACE-M3.md),
  qualification (QUALIFICATION-RUNTIME.md).

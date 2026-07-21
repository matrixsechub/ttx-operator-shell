# MULTI-ACCOUNT-MODEL — model definition (planning)

**Status:** PLANNING ONLY — no implementation. Defines the account model that
division-scoped enforcement, multi-tenant entitlements/tiers, and operator/user
identity separation require. Blocked until Council commissions the account packet
(named as the prerequisite since Track 4 BILLING-PACKET §4). | **Date:** 2026-07-16

## 1. Why it's needed

Everything through Track 6 keys off a single **subject** string: the operator's JWT
handle, `anon:<sessionId>`, or `anonymous`. That is sufficient for one operator plus
anonymous prospects, but it cannot express: multiple members under one division,
division-wide entitlements, or the operator-vs-user distinction the ops-division and
enterprise tiers assume (ENTITLEMENT-MODEL §5, TIER-PERSISTENCE).

## 2. Account entity

```
Account {
  id:         string        // stable account id (not a session id)
  kind:       "operator" | "member"
  divisionId: string | null // null for solo/operator, set for division members
  displayName?: string
  createdAt:  string
}
```

- **operator** — a full cockpit identity (today's single-operator JWT generalized).
- **member** — a user under a division; may hold personal entitlements but inherits
  division-scoped grants.
- Identity separation: operators authenticate via the existing JWT plane
  (`worker/auth.ts`); members authenticate via a member-session plane (new; scoped
  tokens, no cockpit access unless separately granted).

## 3. Tenancy keying migration

| Today (Track 5) | Multi-account |
|---|---|
| `pearl:tier:<subject>` | `pearl:tier:<accountId>` + `pearl:division:<divisionId>:tier` |
| `pearl:entitlements:<subject>` | `pearl:entitlements:<accountId>` + `pearl:division:<divisionId>:entitlements` |
| `pearl:qualification:<registerId>` | unchanged (capture-anchored, pre-account) |
| `pearl:acquisition:<uuid>` | gains `accountId` + `divisionId` fields |

A `subject → accountId` resolver replaces the ad-hoc subject strings; anonymous
prospects map to ephemeral member-less accounts until they register+authenticate.

## 4. Auth evolution

From single-operator secrets (`OPERATOR_CALLSIGN`/`OPERATOR_PASSWORD_HASH`/
`AUTH_SIGNING_KEY`) to: an operator directory (still few, JWT), plus a member identity
issuer (division-scoped session tokens). The edge gate (`worker/edge/gate.ts`) gains a
third route class posture — member-authenticated — between public and operator.

## 5. Phased migration (when unblocked)

1. Introduce the Account entity + `subject→accountId` resolver as a compatibility
   shim (existing subjects become single-member accounts) — zero behavior change.
2. Add divisionId to entitlement/tier records; resolver unions personal + division.
3. Member identity issuer + member route class.
4. Backfill/rekey KV under the new scheme behind a migration flag.

## 6. Prerequisites this unblocks

Division-scoped enforcement (DIVISION-ENFORCEMENT.md), multi-tenant billing
(subscription-mode checkout per account), seat counting, private catalog lanes as
real access control (not display-only). None of these can ship before this model
lands.

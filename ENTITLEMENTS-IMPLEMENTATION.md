# ENTITLEMENTS-IMPLEMENTATION — implementation record (Track 5)

**Status:** IMPLEMENTED | **Date:** 2026-07-16 | **Contract:** ENTITLEMENT-MODEL.md

## 1. What shipped (`worker/entitlementsWorker.ts`)

- **Pure resolver** `resolveEntitlements(subject, tier, record)` implementing
  `effective = baseline(tier) ∪ activeGrants(packs) − revocations`, deny-by-default.
  Tier baselines and pack grant templates exactly as tabled in ENTITLEMENT-MODEL §2–3
  (`TIER_BASELINES`, `PACK_TEMPLATES`).
- **Latent grants:** a pack below its `minimumTier` is reported in `latent[]` with the
  tier that would activate it — never deleted, so downgrades are non-destructive.
- **Single-writer grant path** `grantPack()` — idempotent per acquisitionId and per
  kind+slug; the ONLY code path that appends pack holdings (used by the billing
  webhook/sandbox settle).
- **Declarative catalog mapping** `packKindFromTags()` — CatalogItem `tags` carry the
  pack family; no per-pack code. M0 tagging landed in `worker/catalogData.ts`
  (`agent-pack` → ai-architect-001, `automation-pack` → mission-001, `scenario-pack`
  → ttx-001, `intelligence-pack` → threat-intel-001).

## 2. Endpoints

| Endpoint | Auth | Behavior |
|---|---|---|
| `GET /api/entitlements/resolve` | public | Effective set for current subject (operator JWT → handle; `?sessionId=<uuid4>` → `anon:<id>`; else `anonymous` → ACCESS baseline) |
| `GET /api/entitlements/get` | operator JWT (default-deny gate + in-handler check) | Raw stored record for `?subject=` |
| `POST /api/entitlements/set` | operator JWT | Replace pack holdings `{subject?, packs:[{kind, slug}]}` — validated against the pack registry |

Storage: KV `TTX_STATE` key `pearl:entitlements:<subject>`.

## 3. First real enforcement point

`POST /api/billing/checkout-session` requires `marketplace.acquire` in the resolved
set — ACCESS-tier subjects receive `403 { requiresTier: "operator" }`. This is the
first place `service_tier` semantics became enforced; the catalog itself remains
fully browsable at every tier (Option B), and `access_level` on catalog items is
still display-only.

## 4. Tests

`tests/entitlements.test.ts`: baseline/deny-by-default, union rule, latency below
minimumTier, intelligence-pack division floor, revocation precedence, grantPack
idempotence, endpoint auth (401s), anonymous resolution.

## 5. Known limits

Single-operator identity model persists (subjects are operator handle or anonymous
session ids); a multi-account model remains the prerequisite for org/division-scoped
enforcement. Division-wide pack propagation (ops-division scope) is modeled but not
yet distinct from per-subject storage.

# STRUCTURAL-REBUILD — Track 5 summary

**Status:** IMPLEMENTED | **Date:** 2026-07-16 | **Branch:**
`claude/pearl-spectral-track-1-f2tyil`

Track 5 is the first track where structural boundaries lifted. Everything below is
live, CI-gated (lint R1–R15), typechecked, unit-tested (156 tests green), and built.

## 1. What shipped

| Workstream | Files | Record |
|---|---|---|
| Pearl substrate promoted to live | `src/pearl/` (primitives, contract, `entityNames.ts` shared with the worker project) | — |
| Qualification engine | `src/pearl/qualificationMachine.ts`, `worker/qualificationRuntime.ts`; `POST /api/qualification/evidence`, `GET /api/qualification/state` | [QUALIFICATION-ENGINE.md](QUALIFICATION-ENGINE.md) |
| Wizard mount (structural) | `src/pearl/onboardingWizard.tsx`; `/onboarding` re-routed from the static pager to the ecosystem SPA (`surfaceRegistry` + `funnelRecovery` + `ecosystemRouter`) | [WIZARD-IMPLEMENTATION.md](WIZARD-IMPLEMENTATION.md) |
| Entitlement persistence | `worker/entitlementsWorker.ts`; `/api/entitlements/{get,set,resolve}`; M0 catalog pack tagging | [ENTITLEMENTS-IMPLEMENTATION.md](ENTITLEMENTS-IMPLEMENTATION.md) |
| Tier persistence | `worker/tierWorker.ts`; `/api/tier/{get,set}` | [TIER-PERSISTENCE.md](TIER-PERSISTENCE.md) |
| Marketplace M3 purchase flow | `worker/marketplaceBillingWorker.ts` (Stripe-ready + sandbox), `src/pearl/marketplacePurchase.tsx` in the catalog detail modal; `/api/billing/checkout-session`, `/api/webhooks/billing`, `/api/billing/acquisition` | [MARKETPLACE-M3-IMPLEMENTATION.md](MARKETPLACE-M3-IMPLEMENTATION.md) |
| SPA capture upgrade | `src/lib/prismTracker.ts` (mutation-aware impressions), `flowTracker` refactor, storefront router capture mount | [SPA-CAPTURE.md](SPA-CAPTURE.md) |

## 2. Doctrine posture after Track 5

- **Option B remains structural:** the wizard captures before it questions; the
  recommendation never walls; the catalog browses at every tier; grants come only
  from the billing single-writer, never from client-reported signals.
- **Capture policy intact:** PRISM on public surfaces only; operator shells stay
  capture-free; `/api/flow/event` is the sole channel (R12/R15).
- **Token discipline intact:** every new UI is op-*/entity-* pure; both new voice
  surfaces are lint-enforced (R13, now 13 surfaces).
- **Auth planes respected:** privileged writes (`/api/tier/set`,
  `/api/entitlements/{get,set}`) sit behind the default-deny operator-JWT gate plus
  in-handler checks; public reads are allow-listed explicitly.
- **Billing safety:** production without Stripe keys 503s — no charge, no grant.
  Sandbox grants are stamped `sandbox: true` and only occur off-production or behind
  an explicit flag.

## 3. Storage map (all in existing `TTX_STATE` KV; no new namespaces)

`pearl:qualification:<registerId>` (evidence, 90d TTL) ·
`pearl:entitlements:<subject>` · `pearl:tier:<subject>` ·
`pearl:acquisition:<uuid>` (90d TTL).

## 4. Verification

`npm run lint:brand` green (R1–R15; 13 voice surfaces) · typecheck clean across all
four tsconfig projects · **156/156 tests** (36 new across qualification machine/
runtime, entitlements/tier, billing) · `npm run build` assembles; routing swap
verified (`resolveHtmlSurface("/onboarding") → ecosystem-shell`, recovered map
released it; `/register` et al. untouched). Not deployed.

## 5. Follow-up packets (not in Track 5)

Stripe key provisioning + live webhook wiring; subscription-mode (tier) checkout +
customer portal; refund/downgrade policy execution; multi-account model (org/
division identity); division-wide pack propagation; static-page prismTracker port.

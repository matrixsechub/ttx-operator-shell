# Scope-Lock Reconciliation — Decision Packet

**Date:** 2026-09-17 · **From:** ARCH-01 / SEC-01 (advisory) · **To:** OPERATOR · **Status:** DECISION REQUIRED, nothing implemented

Two subsystems ship, are routed, and are tested, yet sit outside the REAL list in `SCOPE-LOCK.md`. This packet states the conflict and the options. **Neither option is implemented, and no scope-lock line was amended.** Per the mission boundary, no auth, billing, entitlement, marketplace, or tier runtime was retired.

Evidence labels: VERIFIED (read and/or executed here), INFERRED, UNKNOWN.

---

## Tension 1 — Backend auth/session runtime

### OBSERVED_RUNTIME (VERIFIED)

| Layer | Artifacts |
|---|---|
| Credentials | `worker/auth.ts` (PBKDF2 verify, HS256 access/refresh tokens), `worker/passwordHash.ts` (unused duplicate, F15), `scripts/hash-password.mjs` |
| Second credential system | `worker/edge/gate.ts`, `worker/edge/crypto.ts`, `worker/hsxEdge.ts`, `worker/marketplaceEdge.ts` |
| Enforcement | `worker/apiAuth.ts`, `worker/kernel.ts` (`enforceCockpitSession`), `worker/backbone.ts` |
| Sessions | `worker/sessionBridge.ts`, `worker/do/session.ts` (`SessionDO`, 12 h TTL, 10 per operator) |
| State | KV `AUTH_REVOCATION`, KV `SECURITY_EVENTS`, DO `SESSION` |
| Secrets | `OPERATOR_CALLSIGN`, `OPERATOR_PASSWORD_HASH`, `AUTH_SIGNING_KEY`, `OPERATOR_SECRET`, `MARKETPLACE_SECRET` |
| Surface | `/api/auth/login`, `/me`, `/session`, `/logout`, `/refresh`; `/api/operator/auth`; the `/login` SPA shell |
| Tests | `apiAuth`, `operatorAuth`, `operatorAuth.security`, `cockpitSessionBoundary`, `gateOrdering` |

### CURRENT_SCOPE_LOCK (VERIFIED)

RETIRED list includes "Backend auth/session layer, RBAC-bound role assignment", "Multi-operator identity model, operator tiers, UUID operator identity, MFA enforcement", "RBAC, permission ceilings, scope registries". The REAL list names no auth component, and the document closes with "No auth."

### CONFLICT

The scope lock says the product has no backend auth. The product has two, plus a Durable Object session store and a KV revocation denylist. Every enforcement decision in the Worker depends on them. The scope lock is not merely silent; it explicitly denies what ships.

Consequence beyond bookkeeping: `SCOPE-LOCK.md` is the enforcement reference used to reject drift in phase documents. While it denies a shipped subsystem, it cannot be applied literally, which weakens it as a gate for everything else.

### DEPENDENCIES

`/api/ops/*`, `/api/security/events`, `/api/webhooks/*`, governance propose and approve, every operator-class route since the F1 remediation, the cockpit SPA's `RequireAuth`, and the F1/F3 security work already on this PR. Entitlements, tier, and recommendation handlers call `getAccessTokenOperator` for optional operator context.

### OPTION_A — Amend the scope lock to match the tree

Move a bounded auth description into REAL: single-operator credential auth with signed access and refresh tokens, KV refresh revocation, and a Durable Object session record. Keep RBAC, multi-operator identity, operator tiers, and MFA explicitly RETIRED, since none of those ship.

- Cost: one documentation change, no code.
- Effect: the scope lock becomes literally applicable again; F16 closes; the open items F5 through F10 become ordinary hardening inside declared scope.

### OPTION_B — Retire the runtime

Remove auth from the Worker and return to implicit browser-context identity.

- Cost: delete or neuter `auth.ts`, `apiAuth.ts`, `sessionBridge.ts`, `do/session.ts`, `edge/gate.ts`; drop two KV namespaces and one Durable Object; remove five test suites; reopen every route the F1 remediation just closed; the cockpit loses its login boundary.
- Effect: `/api/ops/*`, governance mutations, and operator listings become publicly reachable.

### COMPATIBILITY / migration risk

| | Option A | Option B |
|---|---|---|
| Code change | none | large, multi-file, destructive |
| Data | none | orphan KV entries and DO records |
| Security posture | unchanged | **materially worse**: reverses the F1 fix |
| Deployed clients | unaffected | any client sending a bearer token breaks |
| Reversibility | trivial | hard; tests and history would be gone |

### RECOMMENDATION

**Option A**, with the retired sub-concepts kept retired. Option B is not a documentation fix; it is a deliberate removal of the access control this PR just strengthened, and would contradict the Operator direction that auth runtime must not be retired in this mission.

### OPERATOR_DECISION_REQUIRED

1. Approve Option A or Option B.
2. If A: authorize a scope-lock amendment mission and state whether the REAL entry should name both credential systems or only the canonical `auth.ts` one (F5 proposes consolidating onto the canonical one).
3. Confirm RBAC, multi-operator, operator tiers, and MFA stay RETIRED regardless.

---

## Tension 2 — Billing, entitlements, and tier runtime

### OBSERVED_RUNTIME (VERIFIED)

| Layer | Artifacts |
|---|---|
| Billing | `worker/marketplaceBillingWorker.ts` (346 lines), routes `/api/billing/checkout-session`, `/api/billing/acquisition`, `/api/webhooks/billing` |
| Entitlements | `worker/entitlementsWorker.ts`, route `/api/entitlements/resolve` |
| Tier | `worker/tierWorker.ts`, route `/api/tier/get` |
| Adjacent | `worker/qualificationRuntime.ts`, `worker/recommendationEngine.ts`, `worker/marketplaceIntentRouter.ts`, `worker/fulfillmentAgentRoutes.ts` |
| State | DO `MARKETPLACE`; KV `TTX_STATE` for qualification evidence |
| UI | `src/pearl/marketplacePurchase.tsx`, `src/pearl/upgradeAdvisor.tsx`, `src/pearl/qualificationMachine.ts` |
| Tests | `billingWorker`, `entitlements`, `qualificationMachine`, `qualificationRuntime`, `recommendationEngine` |
| Records | `MARKETPLACE-M3-IMPLEMENTATION.md` ("IMPLEMENTED (Stripe-ready + sandbox, per Council billing decision)"), `ENTITLEMENTS-IMPLEMENTATION.md`, `TIER-PERSISTENCE.md`, `UPGRADE-ADVISOR.md` |

### CURRENT_SCOPE_LOCK (VERIFIED)

RETIRED includes "Backend marketplace delivery flows (content delivery pipelines, purchase/onboarding flows)", "SKU tracking, PDF watermarking, expiring download tokens", "Upwork consulting tiers, freelance positioning, service-tier pricing bands", "Backend persistence layer (beyond what's needed for a real TTX data model)". REAL names marketplace only as UI: `CatalogGrid`, `CategoryPageBody`, category pages, and a `CatalogItem` schema extension whose `access_level` is "UI display filter only" and whose compliance tags are "metadata only".

### CONFLICT

A purchase and entitlement runtime ships with a checkout-session endpoint, a billing webhook, tier persistence, and a Durable Object, while the scope lock retires backend purchase flows and confines the marketplace to UI plus display-only metadata. Unlike Tension 1 this conflict is **self-documented**: `MARKETPLACE-M3-IMPLEMENTATION.md` records the work as shipped "per Council billing decision", which suggests a Council decision post-dated the scope lock and was never written back into it (INFERRED; the Council decision record itself was not located in this repo, so the authority chain is UNKNOWN).

### DEPENDENCIES

`/api/qualification/*`, `/api/recommendation/evaluate`, `/api/marketplace/intent`, the Pearl wizard and upgrade advisor UI, the `MARKETPLACE` Durable Object, and five test suites. `BILLING-PACKET.md`, `ENTITLEMENT-MODEL.md`, `UPGRADE-PATH.md`, and `MARKETPLACE-M3.md` are the planning contracts these implement.

Live-payment status is **UNKNOWN** from this repo: the code is described as "Stripe-ready + sandbox", and whether a production payment credential is configured cannot be determined here. That matters because it decides whether Option B has financial or customer consequences.

### OPTION_A — Amend the scope lock to match the tree

Move a bounded entry into REAL: marketplace acquisition runtime comprising checkout-session creation, a billing webhook, entitlement resolution, and tier persistence backed by the `MARKETPLACE` Durable Object. Keep SKU tracking, PDF watermarking, expiring download tokens, and Upwork consulting tiers explicitly RETIRED, since none ship. Attach the Council billing decision reference so the authority chain is recorded.

- Cost: one documentation change plus locating the Council decision.
- Effect: the four planning documents (`BILLING-PACKET`, `ENTITLEMENT-MODEL`, `UPGRADE-PATH`, `MARKETPLACE-M3`) reclassify from PLANNING to contracts for shipped code in `docs/INDEX.md`.

### OPTION_B — Retire the runtime

Remove the billing, entitlement, and tier handlers and their routes; keep the marketplace as UI plus display-only metadata.

- Cost: remove three worker modules and their routes, the `MARKETPLACE` Durable Object usage, five test suites, and two Pearl UI flows; any in-flight purchase or entitlement state is stranded.
- Effect: aligns the tree with the scope lock as written.

### COMPATIBILITY / migration risk

| | Option A | Option B |
|---|---|---|
| Code change | none | three modules plus routes and UI |
| Data | none | `MARKETPLACE` DO records and entitlement state stranded; **migration plan required** |
| Customer impact | none | any customer holding an entitlement loses resolution; if live payments exist, this is a commercial and possibly contractual event |
| Deployed clients | unaffected | Pearl purchase and upgrade flows break |
| Reversibility | trivial | hard |
| Blocking unknown | none | whether live payment credentials are configured (UNKNOWN here) |

### RECOMMENDATION

**Option A.** The runtime is not accidental drift: it has implementation records, tests, UI, and a cited Council decision. The defect is that the scope lock was never updated, which is a documentation failure rather than a code failure. Option B carries an unquantified customer and possibly financial risk that cannot be assessed from this repository, and it should not be chosen without first resolving the live-payment UNKNOWN.

### OPERATOR_DECISION_REQUIRED

1. Approve Option A or Option B.
2. Confirm whether the Council billing decision exists as a retrievable record, and where. If it does not, decide whether to ratify the shipped runtime now.
3. State whether live payment credentials are configured in production. This is the blocking unknown for Option B and is also needed to rank residual risk.
4. If A: authorize a scope-lock amendment mission covering both tensions in one edit, and confirm that SKU tracking, watermarking, expiring tokens, and consulting tiers stay RETIRED.

---

## Cross-cutting note

Both tensions have the same shape: the scope lock froze on 2026-07-01, and Tracks 4 through 6 shipped runtime through 2026-07-16 without amending it. A standing rule would prevent recurrence, for example: any implementation record that adds a Worker route must, in the same change, either cite a REAL entry in `SCOPE-LOCK.md` or open a scope-lock amendment. That rule is a proposal, not an action taken.

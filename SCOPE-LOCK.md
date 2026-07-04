# MatrixSecHub — Scope Lock

**Effective:** 2026-07-01 | **Status:** CONFIRMED | **Supersedes:** all prior phase/blueprint framing of MatrixSecHub as an AI agent platform

MatrixSecHub is the MSHOPS-Storefront SPA. Nothing else. This document is the enforcement reference for every future phase, blueprint, or packet.

---

## RETIRED — do not treat as real in any future document

- Autonomous agents (Sentinel, Mission Composer, RAG Agent, TTX Agent, Copilot Integration Layer as an agent)
- RAG pipeline, vector store, embeddings, retrieval, confidence scoring on retrieval
- Agent orchestration mesh, Agent Handoff Protocol
- Multi-operator identity model, operator tiers, UUID operator identity, MFA enforcement
- RBAC, permission ceilings, scope registries, permission-latency targets
- Immutable governance audit log, 3-year retention compliance evidence store
- SOC 2 / NIST AI RMF / ISO 42001 compliance frameworks and gap analyses
- Upwork consulting tiers, freelance positioning, service-tier pricing bands
- SKU tracking, PDF watermarking, expiring download tokens
- Backend marketplace delivery flows (content delivery pipelines, purchase/onboarding flows)
- Inject sequencing engine, real-time TTX trigger loop, AI-augmented facilitation
- Backend persistence layer (beyond what's needed for a real TTX data model)
- Backend auth/session layer, RBAC-bound role assignment
- Backend secrets rotation policy
- SLO error budgets, Workers observability dashboards keyed to fictional systems
- XP/XXP telemetry, any gamified metric with no defined measurement methodology
- Any backend infrastructure not present in the real repo today

If a future document reintroduces any of these as if already built, that's scope drift — flag it the same way the Phase 9 and Phase 10 Blueprint reviews did. Don't synthesize it as fact.

---

## REAL — the only system MatrixSecHub refers to

- React 19 + Vite + TypeScript strict + Tailwind v4
- Cloudflare Worker deployment (`wrangler.jsonc`, static assets binding, `/api/*` proxy)
- Registries: `DIVISIONS`, `OPERATOR_SYSTEMS`, `MARKETPLACE_CATEGORIES`, `FUTURE_MODULES`
- `ecosystem.ts` cross-reference graph
- Marketplace: `CatalogGrid`, `CategoryPageBody`, category index/detail pages
- `CatalogItem` schema extension (Phase 10 scope: `service_tier`, `compliance_tags` as metadata only, `ttx_eligible`, `deployment_target`, `access_level` as UI display filter only, `kind: "product" | "content"`)
- TTX UI scaffold (`src/operator/ttx/`) — builder, injects, timeline, roles, score, packs — plus the scoring-rubric-then-persistence work defined in the Phase 10 Synthesis Review
- API client (`src/lib/apiClient.ts`) — timeout, graceful degradation, retry/backoff work
- CI (typecheck + build gate), staging activation (existing `env.staging` block), observability (Workers logging), rollback runbook (`wrangler rollback`/`versions`), rate limiting on `/api/*`
- Governance metadata as non-certifying labels only (no badges, no RBAC, no sign-off workflow)
- Explainability as a simple source/last-updated surface on catalog items

No auth. No agents. No RAG. No orchestration mesh. No RBAC. No compliance certification. No Upwork consulting system.

---

## ENFORCEMENT — checklist for any future Phase N document

Before treating a new phase/blueprint/packet as informing real work, check:

1. Does it name React, Vite, TypeScript, Tailwind, or Cloudflare Workers — or does it invent a parallel backend?
2. Does every claimed schema field, component, or system correspond to an actual file in this repo?
3. Does it stay inside the [Phase 10 Synthesis Review](PHASE10-SYNTHESIS-REVIEW.md) scope, or does it silently expand it?
4. Does it reference anything in the Retired list above as if it already exists? If yes → reject, flag as drift, don't produce a synthesis that treats it as fact.

This rule applies starting now, through Master Packet v1.4 and every phase after.

---

## CONFIRMATION

MatrixSecHub is a frontend SPA with a marketplace, registries, a TTX module, and non-certifying governance metadata — not an AI agent platform. The fictional platform is retired. Future synthesis work applies this scope lock automatically.

---

## AMENDMENTS

### 2026-07-04 — `OPERATOR_ROLE` / `OPERATOR_ACCESS_LEVEL` reaffirmed display-only

Reaffirming the existing RBAC retirement (see RETIRED list above) against the specific fields that
tempt reversal in practice: `OPERATOR_ROLE` and `OPERATOR_ACCESS_LEVEL` (`wrangler.jsonc` vars,
carried into the session token by `worker/auth.ts`, echoed as `X-Operator-Role` /
`X-Operator-Access-Level` headers by `src/lib/apiClient.ts`, and used as a UI display filter on
`CatalogItem.access_level`).

**Decision:** these remain display-only labels. No code path may branch on them to grant, deny, or
gate access to any route, API response, or UI affordance. This applies to the Worker, the Engine
proxy contract, and the frontend alike.

Do not reintroduce RBAC by reversing this decision piecemeal (e.g. "just gate this one admin
panel," "just filter this one list server-side by role") — that is the same scope drift the
RETIRED list already forbids, just introduced a field at a time instead of as a named system. Any
future phase that adds enforcement behind these fields must first amend this document explicitly,
not just ship the code.

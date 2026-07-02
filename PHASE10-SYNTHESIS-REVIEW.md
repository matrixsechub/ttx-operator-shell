# Phase 10 Synthesis Review — MSHOPS-Storefront (Claude)

**Generated:** 2026-07-01 | **Scope:** Real, verified codebase only

---

## SCOPE LOCK

**In scope — verified to exist:**
React 19, Vite, TypeScript strict, Tailwind v4, Cloudflare Worker deployment, registries (Divisions/Systems/Marketplace/Future Modules), `ecosystem.ts` cross-reference graph, marketplace (product categories built, content categories not yet added), `CatalogItem` (base schema, not yet extended), TTX module (UI-only scaffold, no persistence), API client (timeout + graceful degradation, no retry), no auth.

**Out of scope — do not build in Phase 10, do not reference as if real:**
Auth/identity system, autonomous agents of any kind, RAG pipeline, agent memory/persistence layer, multi-agent orchestration mesh, RBAC, formal compliance certification (NIST/SOC 2/ISO 42001), Upwork consulting business layer.

Every task below is buildable on top of what exists today without any of the excluded systems.

---

## 1. ENGINEERING PRIORITIES

Ordered by dependency — each unblocks the next:

1. **`CatalogItem` schema extension** — add fields validated in the Phase 9 review as sound: `service_tier` (enum), `compliance_tags` (array[string], free-form metadata only — not a certification claim), `ttx_eligible` (boolean), `deployment_target` (enum), `access_level` (enum: Public/Operator/Internal — **UI display filter only, not enforced security**, since no auth exists to enforce it). Omit `operator_id` until an auth system exists to populate it meaningfully — adding it now would be a field with no real value behind it.
2. **API client retry/backoff** — still the top unresolved item from the original build plan. Blocks every "wire scaffold to live data" task below.
3. **Test coverage baseline** — component + integration tests for the registry lookups and `ecosystem.ts` cross-reference functions before extending them further. Zero coverage today; extending schema and taxonomy without tests compounds risk.
4. **Prove one full data flow end-to-end** — still unresolved from the original plan. Pick Mission Composer, wire it completely (API → state → UI → error path) before replicating the pattern elsewhere.

---

## 2. GOVERNANCE FOUNDATIONS (schema-level only)

No RBAC, no compliance certification, no enforcement layer. What's realistic at this phase is **data modeling for traceability**, nothing more:

1. **Audit event schema (design only)** — define the JSON shape (`timestamp`, `action_type`, `resource_id`, `outcome`) as a TypeScript type in `src/lib/`. Do not build emission, storage, or a review UI yet — that requires deciding on persistence (KV/D1), which is a real new infrastructure decision, not a Phase 10 default.
2. **`compliance_tags` as metadata, not certification** — the field from Section 1 is descriptive labeling only. Nothing in the UI should imply an item has passed a real compliance process until an actual review process exists. This is the same badge-before-check trap flagged in the Phase 9 review — don't repeat it here.
3. **Explainability surface (real gap, still unaddressed)** — add a simple "source / last updated" line to `InfoCard` or catalog item detail views. This is genuinely buildable now and closes the one pillar that's had zero coverage across every prior review.

Do not build Gates, roles, or sign-off workflows in Phase 10 — there's no identity system to attach them to.

---

## 3. MARKETPLACE RECONCILIATION

Concrete plan to resolve the taxonomy mismatch flagged in both prior reviews:

1. Add a `kind: "product" | "content"` discriminator to `CatalogItem`.
2. Extend `MARKETPLACE_CATEGORIES` with content-oriented entries alongside the existing product ones — do not build a second marketplace route tree. Reuse `CategoryPageBody`, branching render logic on `kind`.
3. Retire the Phase 9 Blueprint's Upwork consulting-tier framing entirely from this codebase — that describes a personal service offering, not a storefront feature, and has no natural home in `MARKETPLACE_CATEGORIES`. If that business model matters to you, it belongs in a separate document, not the storefront's taxonomy.
4. Write the category migration mapping explicitly — for each of the 9 existing categories, state its `kind` and default schema field values. This was the one gap the Phase 9 Blueprint left open even in its better-specified parts.

---

## 4. TTX DEPENDENCY CHAIN

Unchanged from the original build plan — still the correct order, still unbuilt:

1. **Scoring rubric definition** — before any other TTX work. Currently `score.tsx` is an empty stub.
2. **Persistence** — wire `builder.tsx` → `service.ts` → a real store for a saved scenario. This is the actual blocker; nothing downstream works without it.
3. **Injects CRUD**, tied to a persisted scenario ID.
4. **Roles**, as static UI-assigned labels only (no real auth-backed assignment — that requires the excluded auth system).
5. **Timeline/playback**, wired to a real inject sequence — build last, it's a rendering layer over 1–3.
6. **TTX Packs marketplace connection** — only after 1–5 exist. `ttx_eligible` (Section 1) can gate this once there's a real scenario to be eligible.

No AI-facilitated real-time injection, no LLM facilitator layer — that's out of scope per the exclusion list and has no persistence layer to run against regardless.

---

## 5. DEPLOYMENT PIPELINE IMPROVEMENTS

Grounded in the actual stack — Cloudflare Workers via `wrangler`, not the Phase 9 Blueprint's generic `.env` manifest model:

1. **CI** — GitHub Actions (or equivalent) running `tsc -b` + `vite build` on every push/PR. Nothing gates `main` today.
2. **Activate the existing staging environment** — `wrangler.jsonc` already has an `env.staging` block. Deploy there before production; this costs no new configuration.
3. **Observability** — enable Workers observability/logging in `wrangler.jsonc`. Not configured today; zero production visibility currently exists.
4. **Rollback runbook** — `wrangler rollback` / `wrangler versions` already work at the CLI level. Write the procedure down now, not the custom checkpoint system from the Phase 9 Blueprint (which doesn't match how Workers actually versions deployments).
5. **Secrets** — `wrangler secret put`, not a `.env` manifest, for anything beyond the current public `ENGINE_API_URL` var. Relevant once any real credential needs to be introduced.
6. **Rate limiting on `/api/*`** — still unaddressed anywhere, including in the Phase 9 Blueprint. Add before this proxy sees untrusted traffic.

---

## 6. PHASE 10 SEQUENCING

| Order | Task | Depends on |
|---|---|---|
| 1 | `CatalogItem` schema extension (§1.1) | None |
| 2 | Marketplace taxonomy reconciliation (§3) | Schema extension |
| 3 | API client retry/backoff (§1.2) | None — parallel to 1–2 |
| 4 | Test coverage baseline (§1.3) | None — parallel to 1–3 |
| 5 | TTX scoring rubric + persistence (§4.1–4.2) | None — parallel track |
| 6 | CI + staging activation (§5.1–5.2) | None — parallel track |
| 7 | One full data flow proven end-to-end (§1.4) | Retry logic (3) |
| 8 | TTX injects/roles/timeline (§4.3–4.5) | Persistence (5) |
| 9 | Explainability surface + audit schema design (§2.1, §2.3) | Schema extension (1) |
| 10 | TTX Packs marketplace connection (§4.6) | TTX chain complete (5, 8), taxonomy (2) |

Items 1, 3, 4, 5, 6 can run in parallel with no cross-dependency. Nothing in this table requires auth, agents, RAG, RBAC, or compliance infrastructure — if any future proposal reintroduces those as prerequisites for Phase 10 work, that's scope drift and should be flagged the same way the Phase 9 Blueprint was.

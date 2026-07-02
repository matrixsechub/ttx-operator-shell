# MatrixSecHub — Prioritized Build Plan (Synthesis Layer)

**Generated:** 2026-07-01 | **Based on:** SYNTHESIS-LAYER-REPORT.md findings

---

## 1. HIGHEST-PRIORITY ENGINEERING TASKS

Ordered by what unblocks the most downstream work:

1. **API client retry/backoff logic** — currently timeout-only (10s, no retry). Any transient Engine failure surfaces as a hard error. This blocks every "wire scaffold to live API" task below.
2. **Prove one full data flow end-to-end** — pick a single system (recommend Mission Composer) and wire it fully: real API call → real state → real UI update → real error path. Don't parallelize across all 12 systems until one is proven. This validates the API client, the registry pattern under load, and the error-handling contract before replicating it.
3. **Zero test coverage** — `tsc -b` catches type shape errors, not behavior errors. Before wiring real APIs to TTX/marketplace/mission composer, add component + integration tests. Regression risk compounds fast once scaffolds go live.
4. **Auth/session layer** — currently fully implicit (browser context = identity). This is a prerequisite for governance tasks (Section 2), multi-operator (Section 5), and any real deployment.
5. **Extend `CatalogItem` type** — current schema is flat (name, description, tags). Governance/content items need different fields (see Section 3). Do this before adding content categories, not after.

---

## 2. HIGHEST-PRIORITY GOVERNANCE TASKS

Grounded in the packet's four pillars — none currently implemented in code:

1. **Traceability first** — add `source`, `version`, `reviewed_by` fields to the catalog schema. This is the cheapest pillar to make real (data model change, not process change) and everything else depends on data existing to trace.
2. **Define "Governance Validated" concretely** — right now it's a label with no backing check. Before it appears anywhere in the UI, define: who validates, against what criteria, and what happens on failure. This is a process decision, not a code task — resolve it before building the badge.
3. **Explainability surface** — add a visible "why is this here / where did this come from" affordance on catalog and system detail pages. Currently zero explainability exists anywhere in the UI.
4. **Version control content, not just code** — the codebase is git-tracked; catalog *content* is static mock data with no changelog. If governance content ships, it needs its own versioning independent of code deploys.

Do not build "Marketplace Verified" or "Expert Reviewed" badges until #2 is resolved — a badge with no real check behind it is worse than no badge.

---

## 3. MARKETPLACE DIRECTION DECISION

**Recommendation: merged dual-market, built as a taxonomy extension — not a parallel system.**

Reasoning:
- The current registry pattern (`MARKETPLACE_CATEGORIES` array + `CategoryPageBody`) is cheap to extend — adding "AI Governance Kits," "Executive Briefings," "Compliance Readiness" as new category entries costs almost nothing architecturally.
- Building a second, separate marketplace system would fragment the UX (operator has to know which marketplace to check) and duplicate the cross-reference graph, breadcrumb logic, and embedded-preview pattern that already works.
- The real cost isn't the taxonomy — it's that content items behave differently from gear items (digital delivery, tiered audience content, review requirements vs. static SKU). That's a `CatalogItem` schema problem (Section 1, task 5), not a routing/architecture problem.

**Do this, in order:**
1. Extend `CatalogItem` to support a `kind: "product" | "content"` discriminator with kind-specific fields
2. Add the packet's category names to `MARKETPLACE_CATEGORIES` alongside existing ones
3. Extend `CategoryPageBody` to render differently based on `kind` (gear card vs. tiered content card)
4. Do **not** build a second `/marketplace`-equivalent route tree

---

## 4. TTX MODULE EVOLUTION

Current state: UI shell + types + service stubs, no backing data, no persistence.

**Build order (dependencies matter — don't skip ahead):**
1. **Define the scoring rubric before building anything else.** `score.tsx` is currently a stub with no rules. You can't wire timeline/playback meaningfully without knowing what "success" means for a scenario.
2. **Wire `builder.tsx` → `service.ts` → real persistence.** Right now a built scenario has nowhere to go. This is the actual blocker — everything downstream (injects, roles, timeline) needs a saved scenario to attach to.
3. **Injects CRUD**, tied to a persisted scenario ID — currently `injects.tsx` has no data source.
4. **Roles**, tied to real operator assignment (blocked on auth — Section 1, task 4).
5. **Timeline/playback**, wired to the real inject sequence — currently static mock. Build last; it's a rendering layer on top of 1–3.
6. **Only after 1–5**: connect `TTX Packs` marketplace category to real exportable scenario templates. Right now it's a category with no real product behind it.

---

## 5. MULTI-OPERATOR SUPPORT

**Defer.**

Reasoning: there is no auth layer yet. The current state model (React state + hooks) doesn't distinguish operators at all — building multi-operator support now means building it on top of a single-operator assumption baked into the API client, dashboard widgets, and TTX roles. That's rework, not addition.

Correct sequence: build real single-operator auth first (Section 1, task 4) → multi-operator becomes an additive scope increase (filter registries by operator ID, scope TTX sessions) rather than an architecture change. Building it now would mean redoing the auth work twice.

---

## 6. DEPLOYMENT PIPELINE IMPROVEMENTS

Current: `git push → npm run build → wrangler deploy`. No CI gate, no staging use, no observability.

**Add, in priority order:**
1. **CI on every push/PR** — run `tsc -b` + `vite build` before merge. Currently nothing stops a broken build from reaching `main`.
2. **Actually use the staging environment** — `wrangler.jsonc` already has an `env.staging` block scaffolded but unused. Deploy there first, verify, then promote to production. This costs nothing new to configure — it's already defined.
3. **Enable Workers observability** — not currently configured in `wrangler.jsonc`. No logs, no request tracing in production today.
4. **Document the rollback runbook** — `wrangler rollback` works at the CLI level, but there's no written procedure. Write it now, before you need it under pressure.
5. **Secrets management** — `ENGINE_API_URL` is currently a public var. Once real auth exists, any tokens must go through `wrangler secret put`, not `vars`.
6. **Rate limiting on `/api/*`** — the Worker proxies to the Engine API with no throttling. Add before this is exposed to real, non-trusted traffic.

---

## 7. STRATEGICALLY IMPORTANT — ADDITIONAL ITEMS

- **Write an `ARCHITECTURE.md`** explaining the registry + ecosystem.ts cross-reference pattern. This session's context makes it obvious; a future contributor (human or agent) starting cold won't have that context. The TTX module already has a README — the rest of the system doesn't.
- **Resolve content ownership before Section 3 ships.** Adding governance/content marketplace categories is a code change; someone has to actually author and review that content on an ongoing basis. That's a process gap the codebase can't solve — flag it now so it's not discovered after the taxonomy is live.
- **Don't build governance badges (Section 2) speculatively.** Every trust-pillar UI element should map to a real, defined check. Build the check first, the badge second — never the reverse.

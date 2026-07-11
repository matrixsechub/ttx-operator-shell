# PRISM — UI/UX Expert Agent (PRISM_UIUX_AGENT_V1)

**Agent ID:** `PRISM_UIUX_AGENT_V1`  
**Council role:** Builder Council UI/UX Specialist  
**Status:** Advisory only — operator-facing, not a public marketplace product

---

## Mission

PRISM evaluates operator-supplied UI/UX scope and returns evidence-backed, prioritized recommendations with optional patch proposals. It supports:

- Individual routes and multi-route flows
- React components
- Responsive behavior, accessibility, design-system consistency
- Conversion friction, visual hierarchy, feedback states
- Before/after comparisons (`COMPARE_STATES`)
- Acceptance review and patch proposal preview

PRISM does **not** autonomously edit files, deploy code, mutate production state, or approve its own recommendations.

---

## Boundaries

| Allowed | Not allowed |
|---------|-------------|
| Deterministic checklist analysis | Arbitrary external URL fetch |
| Optional AI enrichment via governed gateway | Second AI provider abstraction |
| TTX_STATE KV persistence (`mshops:uiux:v1:*`) | New KV/DO bindings |
| Operator JWT on `/api/operator/uiux/*` | Public marketplace exposure |
| Advisory approve/reject records | Mutation authorization (`mutationAuthorized` is always `false`) |

---

## Modes

| Mode | Purpose |
|------|---------|
| `AUDIT_ROUTE` | Single or multi-route audit |
| `AUDIT_FLOW` | Journey across routes |
| `AUDIT_COMPONENT` | Component-scoped audit |
| `ACCESSIBILITY_CHECK` | Accessibility-weighted checklist |
| `DESIGN_SYSTEM_CHECK` | `op-*` token / panel consistency |
| `CONVERSION_REVIEW` | Funnel friction on `/enter`, `/register`, `/intake` |
| `COMPARE_STATES` | Before/after metadata diff |
| `PATCH_PROPOSAL` | Advisory diff previews (never auto-applied) |
| `ACCEPTANCE_REVIEW` | Acceptance criteria validation |

---

## Scoring (100 points)

| Category | Weight |
|----------|--------|
| Usability / task clarity | 25 |
| Accessibility | 20 |
| Responsive behavior | 15 |
| Visual hierarchy | 10 |
| Design-system consistency | 10 |
| Conversion effectiveness | 10 |
| Feedback / state handling | 5 |
| Perceived performance | 5 |

**Release recommendations (advisory):**

- `PASS` — overall ≥ 85, no critical/high
- `PASS_WITH_ADVISORIES` — overall ≥ 70, no critical
- `CHANGES_REQUIRED` — overall ≥ 50 OR any high severity
- `BLOCK_RELEASE` — overall < 50 OR any critical

---

## API

All routes require operator edge JWT (`/api/operator/*` classification).

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/operator/uiux/audits` | Create audit |
| GET | `/api/operator/uiux/audits` | List audit summaries |
| GET | `/api/operator/uiux/audits/:auditId` | Full audit |
| GET | `/api/operator/uiux/audits/idempotency/:key` | Resolve duplicate guard |
| POST | `/api/operator/uiux/audits/:auditId/approve` | Accept findings (advisory) |
| POST | `/api/operator/uiux/audits/:auditId/reject` | Reject findings (advisory) |

Validation: JSON only, max 32 KB, max 8 routes, no `executableCode` / `externalUrl` / `rawHtml`.

---

## Persistence

```
mshops:uiux:v1:audit:{auditId}     — full audit (30d TTL)
mshops:uiux:v1:index               — capped summary index (50 entries)
mshops:uiux:v1:route:{routeHash}   — per-route audit history (10 entries)
mshops:uiux:v1:idempotency:{key}   — duplicate submission guard (30d TTL)
```

`evidenceHash` = SHA-256 of canonical request + fixture version.

---

## Governance

- `advisoryOnly: true` on audit and `PrismCouncilEnvelope`
- AI enrichment gated on `AI_FULFILLMENT_ENABLED` via `maybeEnrichWithAi`
- `checkAutonomy` with `actionKind: "advisory"` before enrichment
- Approve/reject writes `UiUxApprovalRecord` with `mutationAuthorized: false`
- Agent registered in `AGENT_ROUTING_PROFILES` as `trust` profile

### Council envelope (HSX-ready)

Each audit includes:

- **Problem Frame** — scope, score, severity counts
- **Consensus** — top prioritized recommendations
- **Active Disagreements** — conflicting signals (e.g. usability vs accessibility)
- **Recommended Path** — release posture guidance

HSX can consume `audit.councilEnvelope` without PRISM reporting to public users.

---

## Operator workflow

1. Open `/operator/uiux-expert` in the cockpit (auth required).
2. Select mode, viewport, routes (fixture presets available).
3. Run audit — deterministic engine runs first; optional AI bullets if fulfillment enabled.
4. Review scorecard, findings by severity, evidence, acceptance criteria.
5. Approve or reject recommendations — advisory only, no auto-mutation.
6. For `PATCH_PROPOSAL` mode, review diff previews and implement manually if accepted.

---

## Failure behavior

| Condition | Response |
|-----------|----------|
| Malformed body / unknown mode | 400 `{ error }` |
| Missing auth | 401/403 via edge gate |
| Audit not found | 404 |
| TTX_STATE unconfigured | 503 |
| KV write failure | 500 |
| AI enrichment disabled/failed | Deterministic audit returned (no `ai_enrichment`) |

---

## Fixtures (v1)

| Route | Seeded finding theme |
|-------|---------------------|
| `/` (mobile) | Cramped mobile navigation |
| `/services` | CTA hierarchy |
| `/enter` | Form label association |
| `/register` | Step indicator visibility |
| `/intake` | Multi-step clarity |
| `/status` | Empty-state messaging |
| `/apps/automation-builder` | Dense mobile control panel |
| `/apps/security-fleet` | Table horizontal scroll |

---

## Phase 2A — Live browser evidence (PRISM_UIUX_AGENT_PHASE_2A_LIVE_EVIDENCE)

Phase 2A adds a governed Playwright + axe-core capture pipeline that produces structured evidence compatible with the existing `UiUxAuditRequest` contract. PRISM V1 deterministic scoring, KV persistence, and advisory-only behavior are unchanged.

### Architecture

```
npm run uiux:capture:*  →  scripts/uiux/captureEngine.ts
                         →  scripts/uiux/captureRoute.ts (per route/viewport)
                         →  artifacts/uiux/{captureId}/*
                         →  scripts/uiux/prismAdapter.ts
                         →  POST /api/operator/uiux/audits (optional uiux:audit)
```

Capture remains operator-triggered or CI-triggered (`workflow_dispatch`). It does not use the Cloudflare Agents SDK or new Durable Objects.

### Approved target policy

| Class | Example | Auth required |
|-------|---------|---------------|
| `local_dev` | `http://127.0.0.1:5173` | Public routes only |
| `local_preview` | `http://127.0.0.1:4175` (default; override via `PRISM_PREVIEW_PORT`) | Public routes only |
| `staging` | `PRISM_STAGING_ORIGIN` | Operator routes in protected env |
| `production_public` | production origin | Only when `PRISM_ALLOW_PRODUCTION_PUBLIC=true` and public routes |

Rejected: arbitrary URLs, non-HTTP(S), redirects to unapproved origins, authenticated production audits.

### Authentication model

- **Public funnel routes** — no operator session required.
- **Operator cockpit routes** (`/operator/uiux-expert`) — requires `PRISM_OPERATOR_CALLSIGN` + `PRISM_OPERATOR_PASSWORD` (or `OPERATOR_*` aliases). Session is bootstrapped via `/api/auth/login` and injected into Playwright `localStorage` only for the browser context. JWTs are never written to artifacts.
- **Fail closed** — operator capture aborts when credentials are missing or login fails.

### Evidence schema

Types live in `scripts/uiux/types.ts`:

- `PrismBrowserEvidence` — per route/viewport capture record
- `PrismCaptureManifest` — full run with governance envelope
- `PrismCaptureGovernance` — `mutationAuthorized: false` always

Each capture includes: landmarks, heading outline, axe violations, console/page errors, failed requests, focus-order samples, horizontal overflow, clipped screenshot ref, and `evidenceHash`.

### Screenshot handling

- Viewport-clipped PNGs only (not full-page) to limit sensitive operator UI exposure.
- Operator routes use `maskSensitive: true` metadata flag.
- Screenshots stored under `artifacts/uiux/{captureId}/screenshots/`; PRISM receives opaque path refs only.

### Artifact retention

```
artifacts/uiux/{captureId}/manifest.json
artifacts/uiux/{captureId}/evidence.json
artifacts/uiux/{captureId}/screenshots/{routeHash}-{viewport}.png
artifacts/uiux/{captureId}/prism-request.json   (after uiux:audit)
artifacts/uiux/{captureId}/prism-response.json
```

Gitignored by default. CI uploads sanitized artifacts via `.github/workflows/prism-uiux-capture.yml`.

### Local commands

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4175 --strictPort   # separate terminal
npm run uiux:capture:public                        # funnel routes
npm run uiux:capture:operator                      # requires operator creds in env
npm run uiux:audit <captureId>                     # submit to PRISM API
npm run uiux:verify                                # secret scan on artifacts
npm run test:uiux                                  # unit tests
npm run test:uiux:browser                          # one-route integration test
```

Environment variables: `PRISM_CAPTURE_ORIGIN`, `PRISM_CAPTURE_VIEWPORTS`, `PRISM_CAPTURE_DRY_RUN`, `PRISM_STAGING_ORIGIN`, `PRISM_ALLOW_PRODUCTION_PUBLIC`.

### Staging workflow

Manual CI workflow `prism-uiux-capture.yml` builds, starts preview, captures public routes (mobile viewport), verifies artifacts, and uploads evidence. Accessibility and PRISM scores remain advisory — workflow fails only on capture infrastructure errors.

Authenticated staging operator audits belong in Phase 2B (protected environment only).

### Failure behavior

| Condition | Result |
|-----------|--------|
| Unapproved origin | `TargetPolicyError`, capture aborted |
| Redirect to foreign origin | Route failure recorded in manifest |
| Missing operator credentials | Engine error before route capture |
| Malformed manifest | `PrismAdapterError` on audit submit |
| Duplicate idempotency key | Existing audit returned (`duplicate: true`) |

### Known limitations

- Vite preview uses static HTML paths (`/services.html`); worker path routing is exercised on staging/production.
- Operator preview requires client-side `history.pushState` after shell load.
- No video/trace retention; bounded focus traversal (`MAX_FOCUS_STEPS = 15`).
- V1 seeded fixtures (e.g. cramped mobile nav) remain for deterministic unit tests.

### Phase 2B — Staging validation (PRISM_UIUX_AGENT_PHASE_2B_STAGING_VALIDATION)

Phase 2B proves PRISM end-to-end against the live staging Worker at `PRISM_STAGING_ORIGIN` (default: `https://ttx-operator-shell-staging.sogellagepul.workers.dev`).

#### Architecture

```
npm run uiux:staging:full
  → preflight (health, build-info, route probes)
  → staging public capture (Worker paths, no HTML rewrite)
  → staging operator capture (auth + /operator/uiux-expert)
  → route truth matrix
  → PRISM submission proof (POST, fetch, idempotency)
  → fixture drift analysis
  → advisory summary
  → secret scan
  → artifacts/uiux/staging/{runId}/*
```

#### Protected environment

GitHub Environment: **`prism-staging`** (manual `workflow_dispatch` only).

| Secret / variable | Purpose |
|-------------------|---------|
| `vars.PRISM_STAGING_ORIGIN` | Canonical staging origin (exact match required) |
| `secrets.PRISM_OPERATOR_CALLSIGN` | Cockpit `/api/auth/login` |
| `secrets.PRISM_OPERATOR_PASSWORD` | Cockpit login + edge `/api/operator/auth` |
| `secrets.OPERATOR_BEARER_TOKEN` (optional) | Pre-issued edge JWT for API calls |

Never log secret values. Authenticated staging capture does not run on fork PRs.

#### Staging target policy

- Exact hostname match to `PRISM_STAGING_ORIGIN` (no suffix/substring matching)
- HTTPS required for non-local targets
- Rejects credential-bearing URLs, fragments, production origin, redirect escapes
- Operator capture denied on production classification

#### Commands

```bash
npm run uiux:staging:preflight
npm run uiux:staging:capture:public
npm run uiux:staging:capture:operator    # requires staging credentials
npm run uiux:staging:submit <runId>
npm run uiux:staging:drift <runId>
npm run uiux:staging:verify <runId>
npm run uiux:staging:full                # full pipeline
npm run test:uiux:staging                # unit tests (no credentials)
```

Optional: `PRISM_STAGING_PERFORMANCE_PROBE=true` enables bounded navigation-timing probes (public routes only, advisory).

#### Artifact layout

```
artifacts/uiux/staging/{runId}/
  preflight.json
  governance.json
  route-truth-matrix.json
  public-capture/
  operator-capture/
  fixture-drift.json
  prism-request.json
  prism-response.json
  submission-proof.json
  advisory-summary.json
  verification.json
  staging-validation-summary.json
```

#### Infrastructure vs advisory thresholds

| Infrastructure (fails workflow) | Advisory (never fails CI) |
|--------------------------------|-----------------------------|
| Staging unreachable / wrong deployEnv | PRISM overall score |
| Route 404/503 or surface mismatch | Category scores |
| Auth / PRISM API contract failure | Axe violation counts |
| Secret leakage | `CHANGES_REQUIRED` recommendation |
| Idempotency failure | Console warnings |
| `mutationAuthorized !== false` | Fixture drift classifications |

#### Phase 2C — HSX Council integration (PRISM_UIUX_AGENT_PHASE_2C_HSX_COUNCIL_INTEGRATION)

Phase 2C bridges persisted PRISM audits into HSX Council as **read-only advisory intelligence**.

#### Architecture

```
TTX_STATE (PRISM audits + PrismCouncilEnvelope)
  → buildPrismCouncilAdvisoryBundle()
  → GET /api/council/packet (includes prismAdvisories)
  → GET /api/council/prism-advisories
  → POST /api/hsx { action: "list" | "brief" }
  → Council UI /council (PrismCouncilAdvisoryPanel)
```

#### Invariants (non-negotiable)

| Invariant | Enforcement |
|-----------|-------------|
| `advisoryOnly: true` | On bundle, items, and `PrismCouncilEnvelope` |
| `mutationAuthorized: false` | On bundle and items; HSX cannot approve/reject/mutate |
| No fixture rewrite | HSX reads persisted audits only |
| No deploy side effects | No marketplace publication or production mutation |
| Operator gate | `/api/council/*` requires operator JWT |

#### HSX API

`POST /api/hsx` (marketplace-protected, read-only):

```json
{ "action": "list", "limit": 10 }
{ "action": "brief", "auditId": "<optional-audit-id>" }
```

Returns ranked `PrismCouncilAdvisoryItem` projections with `briefingSummary` and `councilEnvelope` fields only.

#### Council UI

`/council` renders `PrismCouncilAdvisoryPanel` when the operator is authenticated. Unauthenticated visitors see a sign-in prompt without exposing audit payloads.

#### Phase 2B gate

Phase 2C assumes a successful staging proof packet with `advisoryOnly: true`, `mutationAuthorized: false`, persisted audits, and zero secret violations.

---

## Future: Lighthouse integration

Performance budgets from Lighthouse can augment `routeMetadata` perceived-performance scoring in a later phase.

---

## Future: Agents SDK integration

If the no-new-DO constraint is relaxed:

1. `PrismUiuxAgent extends Agent` for per-operator audit sessions
2. `@callable({ streaming: true }) runAudit()` for live progress during capture
3. `validateStateChange` to block finding transitions without approval
4. `useAgent` in cockpit for real-time scorecard sync
5. `scheduleEvery` for nightly funnel regression audits
6. SDK `needsApproval` on patch proposals

V1 intentionally uses TTX_STATE KV + REST to avoid new bindings.

---

## Source files

| File | Role |
|------|------|
| `worker/data/prismUiuxTypes.ts` | Canonical types |
| `worker/data/prismUiuxFixtures.ts` | Route fixtures |
| `worker/data/prismUiuxEngine.ts` | Deterministic engine |
| `worker/data/prismUiuxCouncil.ts` | Council envelope builder |
| `worker/prismUiuxStorage.ts` | KV persistence |
| `worker/prismUiuxRoutes.ts` | HTTP handlers |
| `scripts/uiux/captureEngine.ts` | Playwright capture orchestration |
| `scripts/uiux/prismAdapter.ts` | Manifest → `UiUxAuditRequest` |
| `src/pages/ops/UiUxExpertPage.tsx` | Operator UI |
| `src/lib/uiuxExpertService.ts` | API client |

---

## Phase 2D — Operator triage and patch proposals

See [PRISM-TRIAGE-AND-PATCH-PROPOSALS.md](./PRISM-TRIAGE-AND-PATCH-PROPOSALS.md).

| File | Role |
|------|------|
| `worker/data/prismTriageTypes.ts` | Triage + proposal contracts |
| `worker/data/prismTriageEngine.ts` | Grouping + priority scoring |
| `worker/data/prismPatchProposal.ts` | Proposal generator |
| `worker/prismTriageStorage.ts` | Triage/proposal KV |
| `worker/prismTriageRoutes.ts` | Triage HTTP handlers |
| `src/pages/ops/PrismTriagePage.tsx` | `/operator/uiux-expert/triage` |
## Phase 2D.5 — Baseline recovery and staging proof prep

See staging triage smoke: `npm run uiux:staging:triage-smoke` (post-deploy only).

Governance denial precedence: `worker/governance/governanceDenialPrecedence.ts`

| File | Role |
|------|------|
| `worker/governance/governanceDenialPrecedence.ts` | Deterministic denial precedence |
| `scripts/uiux/staging/triageSmoke.ts` | Protected staging triage HTTP smoke |
| `scripts/uiux/run-triage-smoke.mjs` | CLI entry for triage smoke |
| `tests/governanceDenialPrecedence.test.ts` | Precedence regression tests |
| `tests/worker/prismTriageWorkerIntegration.test.ts` | Edge gate + handler integration |

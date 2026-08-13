# OS-CONFORMANCE-EXPANSION — Track 3 implementation record

**Status:** IMPLEMENTED | **Date:** 2026-07-16 | **Companion:**
[SURFACE-IDENTITY-MAP.md](SURFACE-IDENTITY-MAP.md)

Track 3 extended Track 1 conformance from the funnel to every governed OS surface:
cockpit (Atlas plane), dashboard (OperatorShell), marketplace (cockpit + public
storefront), runtime surfaces (TTX suite, Live TTX join), triage/patch surfaces
(`/ops/security`, `/ops/fedgrade`, `/ops/deploy`), and worker-facing UI policy.

## 1. Pearl-Spectral substrate

- All six Vite shells (`ecosystem.html`, `cockpit.html`, `auth.html`, `council.html`,
  `storefront.html`, `index.html`) now link `entity-tokens.css` + `entity-cues.css`.
- `src/styles/index.css` gained a Tailwind `@theme` **entity bridge**:
  `--color-entity-*` aliases are `var(--entity-*)` references, so utilities like
  `text-entity-ghost` exist while `entity-tokens.css` stays the single source of
  truth (no hex duplicated).
- `src/components/EntityVoice.tsx` renders the same `.entity-voice` cue the funnel
  uses; assignments in SURFACE-IDENTITY-MAP.md.
- The visual *pearl-light theme* is **not** applied — that is Track 2 Phase 1,
  Council-gated (REBUILD-PLAN.md). Substrate here = tokens + cues + discipline.

## 2. Rogue colors/utilities removed

| Surface | Before | After |
|---|---|---|
| `src/pages/LiveJoin.tsx` | Full rogue neutral/emerald palette (`bg-[#0e0e10]`, `#141416`, `#2a2a2e`, `text-gray-*`, `emerald-*`, `yellow-400`, `red-9xx`) | op-token utilities (`bg-op-bg`, `bg-op-panel`, `border-op-border`, `text-op-text*`, `text-op-accent`, `text-op-amber`, `op-danger`) |
| `src/pages/ops/{Deploy,FedGrade,Security}Ops.tsx` | `text-zinc-100/200/300/400/500` | `text-op-text` / `text-op-text-dim` |

## 3. Capture (PRISM) expansion — OS-wide policy

- **Included:** every non-operator `public/*.html` page now loads
  `/scripts/flow-tracker.js` (marketing, docs, tools, funnel — lint R14), plus the
  three PUBLIC shells (ecosystem `/`, storefront, app index).
- **Tagged CTAs:** storefront `Operator login` (`storefront-operator-login`) and every
  catalog card (`catalog-item-<id>`; ids sanitized server-side by `sanitizeCtaId`).
- **Excluded by policy (lint-enforced):** operator shells (`cockpit.html`,
  `auth.html`, `council.html`) and static operator consoles
  (`public/*-operator.html`). Rationale: growth capture measures prospects, not
  operators — operator sessions would pollute funnel intelligence, and the credential
  surface stays analytics-free. Operator telemetry continues through its existing
  plane (SystemHUD, `/api/system/state`).
- **Known SPA limitation:** flow-tracker binds CTA impression observers at document
  load, so React-rendered CTAs emit `cta_click` (delegated) but not
  `cta_impression`, and client-side route changes don't emit `page_view`. A
  mutation-aware tracker is deliberately deferred — capture-layer changes stay
  minimal until R0 worker restoration lands.

## 4. Lint expansion (CI-gated, rules R9–R14)

`scripts/ci/brand-conformance-lint.mjs` now also enforces: no raw hex in `src/`
outside the `@theme` token source (R9); no named Tailwind palettes (R10); no
arbitrary hex utilities (R11); shell substrate + capture policy (R12); voice cues on
the eleven key OS surfaces (R13); OS-wide capture coverage on non-operator public
pages (R14). Same `npm run lint:brand` gate in `_reusable-build-test.yml`.

## 5. Token-annotated wireframes — cockpit & dashboard (current-structure)

These annotate the EXISTING structure with its governed tokens (no rebuild implied).

### Dashboard (`/dashboard`, OperatorShell + Dashboard.tsx)

```
+-- OperatorShell header ── border-op-border ─────────────────────────────+
| ▲ MSH OPS               operator // handle        [⌘K] [Logout]          |
|   text-op-accent        text-op-text-dim          border-op-border-bright|
+--------------------------------------------------------------------------+
| nav rail (border-op-border)      | main                                   |
|  active: border-op-accent/60     |  SystemHUD                             |
|          bg-op-accent/10         |  h1 "Operator Cockpit" text-op-accent  |
|          text-op-accent          |  sub text-op-text-dim                  |
|  idle:   text-op-text-dim        |  ► EntityVoice OPERATOR                |
|                                  |    border-left --entity-operator       |
|                                  |    veil --entity-operator-veil         |
|                                  |  TelemetryPanel / MissionBoard / ...   |
|                                  |  panels: .op-panel bg-op-panel         |
|                                  |          border-op-border              |
+----------------------------------+----------------------------------------+
  ground: bg-op-bg · text: text-op-text · alerts: op-amber / op-danger
```

### Cockpit marketplace (`/marketplace` under OperatorShell)

```
|  Breadcrumbs  text-op-text-dim                                            |
|  h1 "Marketplace" text-op-accent      [Refresh] border-op-border-bright   |
|  ► EntityVoice AURELIUS  (--entity-aurelius accent + veil)                |
|  CatalogGrid: .op-panel cards, hover border-op-accent/50 bg-op-accent/5   |
|    each card data-flow-cta="catalog-item-<id>"                            |
|    kind badge border-op-border-bright text-op-text-dim                    |
```

Future pearl-theme variants of these frames are Track 2 Phase 1 scope and will swap
token *values*, not this structure.

## 6. Verification

`npm run lint:brand` green (src + shells + 11 voice surfaces), `npm run typecheck`
clean, full test suite green, `npm run build` assembles.

# SPA-CAPTURE — implementation record (Track 5)

**Status:** IMPLEMENTED | **Date:** 2026-07-16

## The gap (from OS-CONFORMANCE-EXPANSION §3)

The React `FlowTracker` already emitted route-change `page_view`s, delegated
`cta_click`s and `form_start`s — but CTA **impressions** were observed once at mount,
so any `[data-flow-cta]` element rendered later (route changes, modals, async catalog
lists) never impressed. The static-page tracker had the same blind spot for injected
content.

## What shipped

**`src/lib/prismTracker.ts`** — mutation-aware impression engine:
- one `IntersectionObserver` (0.5 threshold) + one `MutationObserver` on
  `document.body`; every `[data-flow-cta]` node present now **or added later** is
  observed;
- impressions dedupe per ctaId; `reset()` clears the dedupe set and re-observes on
  SPA route change, so each page view sees at most one impression per CTA;
- emits ONLY through the caller's callback — no capture channel of its own.

**`src/lib/flowTracker.ts`** refactored: impression handling delegated to
`mountPrismTracker`; public API (`recordFlowEvent`, `FlowTracker`) unchanged; dwell,
clicks, and form tracking untouched.

**`src/routes/storefrontRouter.tsx`** now mounts `FlowTracker` in a layout route —
the public marketplace SPA previously had no route-change capture at all (only the
shell's static tracker). Ecosystem router already mounted it; the wizard inherits it.

## Capture policy (unchanged, enforced)

PRISM mounts on PUBLIC surfaces only: ecosystem (`/`, `/onboarding`) and storefront
(`/marketplace*`). Cockpit, auth, and council routers do NOT mount it; the operator
shells remain capture-free (lint R12) and the debug-ingest ban stands (R15). All
events still route exclusively through `POST /api/flow/event`.

## Residual limits

The static `public/scripts/flow-tracker.js` (non-SPA pages) still observes only
load-time CTAs — acceptable, since static pages don't mutate their CTA sets. If a
static page gains injected CTAs later, port `prismTracker` into it then.

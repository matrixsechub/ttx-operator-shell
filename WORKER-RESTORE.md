# WORKER-RESTORE — R0 restoration record (Track 4)

**Status:** IMPLEMENTED | **Date:** 2026-07-16 | **Rule:** no new endpoints — restore
only what existed.

## 1. Restored / verified surfaces

The audit found the mandate's three named surface families **already wired and
validated**; R0's real work was removing what had corrupted the substrate around them.

| Surface | Handler | Auth class | Validation | Storage |
|---|---|---|---|---|
| `POST /api/register` | `worker/funnelRecovery.ts` | public (apiAuth allow-list) | field normalization + length caps (`normalizeNullable`, lookup ids) | KV (`TTX_STATE`, `register:` keys + index) |
| `GET /api/register-lifecycle` / `-queue` / `-security` | `worker/funnelRecovery.ts` | public read (allow-list) | method + path exact-match | KV reads |
| `POST /api/flow/event` | `worker/flowRoute.ts` | public | event enum, UUIDv4 session id, page path, `sanitizeCtaId` (64-char alnum), dwell/click bounds | flow storage (`worker/flowStorage.ts`) |
| `GET /api/marketplace/catalog` | `worker/index.ts` `serveCatalog` → `worker/catalogData.ts` | public | method gate | static catalog |

**Naming note:** the mandate says `/api/catalog`; that path never existed in this
worker. The canonical catalog surface is `/api/marketplace/catalog` and remains so —
creating an alias would be a new endpoint.

## 2. What was purged — the rogue debug capture plane

Seven leftover `#region agent log` blocks POSTed request metadata to a dev-time debug
ingest (`http://127.0.0.1:7654/ingest/…`, hardcoded session id `14ea90`) and spewed
`TRACE:` console noise:

| Location | Fired on |
|---|---|
| `worker/index.ts` fetch entry | every hit to `/`, `/welcome`, `/login`, `/marketplace`, `/ops/*` |
| `worker/edge/gate.ts` ×3 | missing token, binding mismatch, and **every successful authenticated API request** |
| `worker/operator.ts` / `worker/storefront.ts` / `worker/surfaceSpa.ts` | every SPA shell resolution |
| `src/lib/RequireAuth.tsx` | **client-side** — ran in visitors' browsers on login redirect |

In production these fetches failed silently (`127.0.0.1`, `.catch(() => {})`) but
still constructed subrequests per request, and the client-side one shipped debug
telemetry code to end users. All removed. This is the worker-substrate **capture
policy** restored: the only sanctioned capture route is flow-tracker →
`/api/flow/event`.

## 3. What was added

- **Guaranteed error envelope:** the worker `fetch` body now runs inside a top-level
  try/catch (`handleFetch` extraction in `worker/index.ts`). Unhandled exceptions
  return the standard `{ error: "Internal error" }` (500) — the same envelope shape
  the other ~174 error sites already use — instead of a raw platform 500. No stack or
  detail leaks to the response.
- **Governed logging:** the catch emits one structured line
  (`{ level, scope, method, pathname, message }`) via `console.error` — no payload
  data, no secrets. Per-route latency/status telemetry continues through the existing
  `recordTelemetrySample` (`worker/telemetry.ts`).
- **Lint guard (R15, CI-gated):** `scripts/ci/brand-conformance-lint.mjs` now fails
  the build if `worker/` or `src/` reintroduces the debug-ingest endpoint,
  `X-Debug-Session-Id`, agent-log blocks, or `TRACE:` noise.

## 4. Known gaps (documented, not fixed here)

| Gap | Why left |
|---|---|
| Rate limiting (`rateLimitBuckets`) is an in-memory per-isolate Map | Real distributed limiting needs KV/DO counters — a behavior change deserving its own review |
| flow-tracker on SPA surfaces captures clicks but not CTA impressions or route-change page_views | Capture-layer enhancement deferred (OS-CONFORMANCE-EXPANSION.md §3) |
| `/api/register*` GET surfaces are public-read by allow-list | Matches recovered-funnel contract; entitlement-gated reads belong to the entitlement model (ENTITLEMENT-MODEL.md) |
| Worker emits JSON only — entity voice does not apply to API envelopes | By design; voice cues are a presentation-layer concern (SURFACE-IDENTITY-MAP.md) |

## 5. Verification

`npm run lint:brand` (R1–R15) green · typecheck clean · 120/120 tests (funnelRecovery,
apiAuth, flowIntelligence suites cover the restored surfaces) · build assembles ·
repo-wide sweep shows zero debug-ingest remnants.

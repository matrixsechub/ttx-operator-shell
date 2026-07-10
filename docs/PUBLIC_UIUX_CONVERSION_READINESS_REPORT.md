# PUBLIC_UIUX_CONVERSION_READINESS_REPORT

Generated: 2026-07-10  
Repository: `matrixsechub/ttx-operator-shell`  
Branch: `feat/operator-governance-phase-2b`  
Commit: `18304f00dda98823151597305b6742f28c82a0d5`  
Production surface: https://www.mshops.net  
Scope: `/onboarding`, `/register`, Calendly/booking blocks, lead-capture wiring

---

## Verdict

**READY_FOR_STAGING**

Staging validation can proceed after operator configures lead-notification secrets. Production promotion remains blocked until:

1. `LEAD_NOTIFICATION_WEBHOOK_URL` (secret) and `LEAD_NOTIFICATION_EMAIL` (var) are set on the target Worker environment.
2. Staging email proof completes with provider acceptance (inbox confirmation optional but recommended).
3. Primary production Worker (`wrangler.jsonc` root `vars`) includes `PUBLIC_CALENDLY_URL` before production deploy (already present on `env.staging` and `wrangler.mshops-public.jsonc`).

---

## Onboarding

### Prior issue
- Thin generic wizard copy with misleading step UX (`Step 1 of 5` carousel; operator feedback cited non-functional “Step 1 of 3” experience).
- No detailed Operator OS explanation, build-status transparency, or public/private boundary language.
- No consultation CTA integrated with canonical Calendly config.

### Implemented content structure
Single-page activation overview (`public/onboarding.html`) with required sections:

1. **Hero** — “Activate Operator OS” + value proposition + primary CTAs
2. **What Operator OS is** — control-plane explanation across intake, agents, automation, marketplace, governance, telemetry, cockpit
3. **What is being built** — status bands: available now / controlled staging / under development / operator-only
4. **How activation works** — 5-step activation sequence
5. **Public/private boundary** — no auto-approval, no autonomous cockpit unlock
6. **Book a consultation** — Calendly block via shared loader
7. **Next actions** — services, register, login boundary

### Step indicator decision
**Option A applied.** Removed wizard progress UI (`Step X of Y`, Previous/Continue controls, stage carousel) from `/onboarding`. Replaced with descriptive sections and direct CTAs. Regression test asserts absence of orphaned step counter markup on onboarding.

**Out of scope (unchanged):** planner surfaces (`security-fleet.html`, `rag-architecture-planner.html`, etc.) retain real multi-step wizards with functional `Step 1 of 3` labels tied to working step state.

### Routes and CTAs
- `/services` — Explore Services
- `/register` — Register for Updates
- `#onboarding-booking` — Book a Consultation (Calendly)
- `/login` — Login boundary (explicit, non-implying access)

### Accessibility result
- Semantic headings and `aria-labelledby` on major sections
- Status copy uses `role="status"` where applicable
- Keyboard-accessible links/buttons; no fake wizard controls remain on onboarding
- Mobile CTA stack via responsive CSS in `public/styles/onboarding.css`

---

## Calendly

### Canonical configuration source
- Env vars: `PUBLIC_CALENDLY_URL` (preferred) or `CALENDLY_BOOKING_URL`
- Resolver: `worker/publicConversionConfig.ts`
- Public API: `GET /api/public/calendly-config`
- Missing config response: HTTP 503, code `BLOCKED_CALENDLY_URL_REQUIRED`

Configured values:
- `wrangler.jsonc` → `env.staging.PUBLIC_CALENDLY_URL`: `https://calendly.com/matrixsechub/30min`
- `wrangler.mshops-public.jsonc` → `PUBLIC_CALENDLY_URL`: same URL

### Blocks updated
- `public/onboarding.html` — consultation section
- `public/enter.html` — intake handoff block
- Shared client loader: `public/scripts/calendly-booking.js`

### Embed/fallback behavior
- Fetches canonical URL from Worker API
- Renders direct booking link + inline embed host
- Shows unavailable message when config missing
- Loads Calendly widget script once per page
- Telemetry on view, click, embed load, embed failure

### CSP changes
**No broadening beyond scheduling.** Calendly domains appear in `Content-Security-Policy-Report-Only` via `deploymentHeaders()` in `worker/edge/headers.ts`:
- `https://assets.calendly.com` (script)
- `https://calendly.com` (frame)

Enforced HTML CSP via `injectSecurityHeaders()` remains stricter; public funnel pages use deployment/report-only policy path consistent with existing conventions.

### Telemetry
Client events via `public/scripts/conversion-telemetry.js`:
- `calendly_block_viewed`
- `calendly_booking_clicked`
- `calendly_embed_loaded`
- `calendly_embed_failed`

No PII recorded.

### Unresolved configuration
- Primary `wrangler.jsonc` production `vars` block does not yet include `PUBLIC_CALENDLY_URL` (staging + mshops-public configs do).

---

## Lead capture

### API route
- `POST /api/register` (existing, extended)
- Persistence: KV `mshops:funnel:v1:register:*` via `worker/funnelRecovery.ts`

### Persistence
Register records include:
- `source`, `source_page`
- `notification_status`, `notification_message_id`, `notification_attempted_at`
- lifecycle timeline entries for notify success/failure/skipped

### Notification provider
- **n8n-compatible outbound webhook** via `LEAD_NOTIFICATION_WEBHOOK_URL` (secret)
- Recipient from `LEAD_NOTIFICATION_EMAIL` (var)
- Implementation: `worker/leadNotification.ts`
- No new email vendor introduced

### Operator recipient configuration
Required before notification acceptance:
```bash
wrangler secret put LEAD_NOTIFICATION_WEBHOOK_URL --env staging
# set LEAD_NOTIFICATION_EMAIL in wrangler vars or secret as operator policy dictates
```

If missing: lead still persists; notification status `skipped` with code `LEAD_NOTIFICATION_NOT_CONFIGURED`.

### Idempotency
KV key `mshops:funnel:v1:notify:{leadId}` prevents duplicate provider delivery.

### Retries
Up to 3 attempts for transient provider failures; non-retry on explicit rejection.

### Dashboard visibility
Existing `GET /api/register-queue` continues to expose queue preview; notified leads append lifecycle timeline entries.

### Demo mode removal
- Removed production governance block on `POST /api/register` so public registration persists in staging/production.
- Removed `intake-demo-banner.js` from register page
- Removed “Demo Mode — No data stored” copy from register surface
- `/api/public/demo-mode` returns `enabled: false` with staging-safe messaging
- `dist/register.html` and `dist/onboarding.html` contain no demo-mode strings (verified post-build)

---

## Email proof

| Item | Status |
|---|---|
| Test lead ID | Not executed live against staging (no deploy performed) |
| Correlation marker format | `MSHOPS-LEAD-PROOF-{register_id}` implemented |
| Persisted status | Covered by unit test with mocked KV + webhook |
| Provider status | Mocked acceptance in `tests/publicConversion.test.ts` |
| Message/workflow ID | Captured from `x-request-id` / `x-n8n-execution-id` headers |
| Inbox confirmation | **EMAIL_PROVIDER_ACCEPTED_INBOX_CONFIRMATION_PENDING** |
| Duplicate delivery | Unit test verifies idempotency |

**Phase 6 staging proof command (operator-run after secret setup):**
```bash
curl -s -X POST "$STAGING_BASE/api/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Proof Lead","email":"proof@example.com","role":"operator","reason":"MSHOPS-LEAD-PROOF-20260710","source":"proof","source_page":"/register"}'
```

---

## Telemetry

Server-side: `worker/conversionTelemetry.ts` + extended `/api/growth/track` + `POST /api/public/conversion-event`

Events implemented:
- `onboarding_viewed`, `onboarding_cta_clicked`
- `registration_started`, `registration_submitted`, `registration_persisted`
- `lead_notification_requested`, `lead_notification_accepted`, `lead_notification_failed`
- Calendly events listed above

Properties exclude free-text reason, email content, credentials, tokens, cookies, and auth headers.

---

## Tests

| Check | Result |
|---|---|
| typecheck | **PASS** (`npm run typecheck`) |
| unit/integration | **PASS** — 347 tests, 0 failures (`npm test`) including `tests/publicConversion.test.ts` (12 tests) |
| build | **PASS** (`npm run build`) |
| accessibility | Static review only (semantic structure preserved; no automated axe run) |
| staging smoke | Not run (no deploy performed) |
| wrangler staging dry run | **PASS** (`wrangler deploy --env staging --dry-run`) |

### Pre-existing failures (none blocking this patch)
- None observed in typecheck, test, or build after dependency install completed.

### Fixes applied during verification
- `worker/funnelRecovery.ts`: explicit `RegisterRecord` annotation on notification update path (typecheck)
- `tests/publicConversion.test.ts`: idempotency test uses KV `store` map; CSP test asserts `deploymentHeaders()` Report-Only policy

---

## Files changed

| File | Justification |
|---|---|
| `worker/publicConversionConfig.ts` | Canonical Calendly + lead notification config resolution |
| `worker/leadNotification.ts` | n8n webhook delivery, idempotency, retries |
| `worker/conversionTelemetry.ts` | Structured conversion telemetry without PII |
| `worker/funnelRecovery.ts` | Register notification wiring, new public APIs, demo-mode update, type fix |
| `worker/apiAuth.ts` | Public route allowlist for new endpoints |
| `worker/edge/routeClass.ts` | Public route classification for new endpoints |
| `worker/env.ts` | Secret typing for `LEAD_NOTIFICATION_WEBHOOK_URL` |
| `public/onboarding.html` | Operator OS activation content; removed fake wizard |
| `public/scripts/onboarding.js` | Telemetry + register ref display |
| `public/styles/onboarding.css` | Layout/status/CTA styles |
| `public/register.html` | Removed demo mode; added source attribution field |
| `public/scripts/register-page.js` | Production submit flow + telemetry |
| `public/enter.html` | Config-driven Calendly block |
| `public/scripts/calendly-booking.js` | Shared Calendly loader/embed/fallback |
| `public/scripts/conversion-telemetry.js` | Client conversion event helper |
| `wrangler.jsonc` | Staging `PUBLIC_CALENDLY_URL` |
| `wrangler.mshops-public.jsonc` | Production public surface Calendly URL + secret docs |
| `tests/publicConversion.test.ts` | Onboarding, Calendly, lead capture, CSP, idempotency tests |
| `package.json` | Include new test file in `npm test` |
| `docs/PUBLIC_UIUX_CONVERSION_READINESS_REPORT.md` | This report |

---

## Deployment recommendation

**Ready for staging validation only.**

Before staging deploy:
1. Set `LEAD_NOTIFICATION_WEBHOOK_URL` secret (n8n inbound webhook).
2. Set `LEAD_NOTIFICATION_EMAIL` var to operator inbox.
3. Confirm staging already has `PUBLIC_CALENDLY_URL` (present in `wrangler.jsonc` `env.staging`).

After staging deploy:
1. Verify `/onboarding?source_page=%2F` content and CTAs.
2. Verify `/api/public/calendly-config` returns 200 with canonical URL.
3. Submit proof registration; confirm KV persistence + webhook acceptance + `/api/register-queue` entry.
4. Confirm no “Demo Mode — No data stored” in `/register` HTML.

**Do not deploy production.**  
**Do not merge or push** unless explicitly authorized.

---

## Baseline inventory (Phase 1)

- **Branch / SHA:** `feat/operator-governance-phase-2b` @ `18304f00dda98823151597305b6742f28c82a0d5`
- **Worktree:** dirty — public conversion files modified; many unrelated untracked artifacts present
- **Public UI files:** `public/onboarding.html`, `public/register.html`, `public/enter.html`
- **Worker routes:** `/api/register`, `/api/public/demo-mode`, `/api/public/calendly-config`, `/api/public/conversion-event`
- **Persistence:** KV `TTX_STATE` (`mshops:funnel:v1:*`)
- **Notification integration:** n8n webhook via `LEAD_NOTIFICATION_WEBHOOK_URL`
- **Calendly references:** canonical via env; hardcoded URL removed from `enter.html`
- **Misleading step strings:** removed from onboarding; planner pages retain functional wizards
- **Demo mode strings:** removed from register; legacy `intake-demo-banner.js` remains in repo but is not linked from register/onboarding

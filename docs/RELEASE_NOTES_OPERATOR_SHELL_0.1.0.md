# Release Notes — Operator Shell 0.1.0 (Production)

**Scope:** Operator-shell-only — not full MSHOPS beta.

**Deployed:** 2026-07-10 · commit `72e7f1e` · version `eb8b067b-8567-42fc-ab10-05fa3e462588`

**URL:** https://ttx-operator-shell.sogellagepul.workers.dev

## Highlights

- **Auth default-deny** — anonymous requests to protected `/api/*` routes return 401
- **Build provenance** — `/api/build-info`, `/api/engine/version`, and `X-Build-Commit` header
- **Staging isolation** — dedicated staging KV namespaces with deploy guardrails
- **Status shim** — `GET /api/system/status` returns worker-native JSON (no engine 404)
- **TTX bridge** — operator TTX UI wired to worker session/local-scenario APIs
- **Multi-surface SPA** — ecosystem, auth, cockpit, council shells from one Worker

## Production verification

Release-handoff gate (use after deploy):

```bash
npm run verify:deploy:handoff -- https://ttx-operator-shell.sogellagepul.workers.dev <commit-sha>
```

## Known limitations (not blockers for operator-shell scope)

- `/enter` and `/marketplace` return **503** until MSHOPS storefront bundle (`dist/app/`) is assembled and deployed
- `/systems` serves cockpit SPA HTML without session redirect; **APIs remain protected**
- Full beta gate (`npm run verify:deploy:beta`) will fail until storefront and beta subsystems are complete

## Rollback

Previous production version: `bb274ae6-dcb5-464d-a835-c7bc52ada477`

```bash
wrangler rollback bb274ae6-dcb5-464d-a835-c7bc52ada477
```

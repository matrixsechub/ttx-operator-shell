> 📡 **GitHub SOP** — All repo operations governed by the [MSH-OPS GitHub SOP](https://app.clickup.com/9017787639/docs/8cr117q-3237). Branch strategy, PR protocol, and merge rules apply.

---

# MSH OPS Operator Shell

Multi-surface operator storefront served by a Cloudflare Worker with static assets.

**Production:** `https://ttx-operator-shell.sogellagepul.workers.dev`

## Stack

- **Frontend:** React 19 + Vite + TypeScript + React Router + Tailwind CSS v4
- **Worker:** Cloudflare Worker (`worker/index.ts`) — API routes, auth, TTX engine, surface routing
- **Assets:** `dist/` via Wrangler static assets binding (`run_worker_first: true`)

## Surfaces

| Surface | Shell | Routes |
|---|---|---|
| Ecosystem | `ecosystem-shell.html` | `/` |
| Cockpit | `operator-shell.html` | `/dashboard`, `/ttx`, `/systems`, `/ops`, `/status` |
| Auth | `auth-shell.html` | `/login` |
| Council | `council-shell.html` | `/council` |
| Storefront | `app/index.html` | `/marketplace`, `/storefront` |

## Develop

```bash
npm install
npm run dev           # Vite :5173
npm run worker:dev    # build + wrangler dev
```

## Build, test, typecheck

```bash
npm run typecheck
npm test
npm run build
```

## Deploy

```bash
npm run deploy                 # production
npm run deploy:staging         # staging
```
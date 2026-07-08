# Dist Package Integration Notes

## Scope

The compiled `mshops-dist` bundle was treated as build output and integrated into the local operator-shell storefront without modifying the dist files themselves. The live source of truth in this repo remains the static Node storefront under `public/` plus the local API surface in `server.js`.

## Component Mapping

The dist HTML components were mapped into the current source boundaries like this:

- `hero.html` -> landing hero in `public/index.html`
- `operator-profile.html` -> operator dossier section in `public/index.html`
- `marketplace-strip.html` -> landing marketplace strip in `public/index.html` and full registry view in `public/marketplace.html`
- `packages-strip.html` -> packages section in `public/index.html`
- `deliverables-strip.html` -> deliverables section in `public/index.html`
- `contact-component.html` -> contact section and identity intake form in `public/index.html`

The memo referenced React and Worker source files, but this repo is not that codebase. The equivalent integration points here are static HTML, CSS, browser JavaScript, and the local Node API server.

## Schema Alignment

The dist JSON schema files were translated into local validation and contract layers:

- `data/contracts.js` mirrors schema enums, deployment metadata, and component mapping.
- `data/validate.js` validates modules, packages, deliverables, and identities against the dist constraints.
- `data/store.js` now stores schema-shaped registry records first, validates them, then derives backend-shaped storefront payloads.

The backend-facing module payload remains:

```json
{
  "id": "multi-agent-cockpit",
  "name": "Multi-Agent Cockpit",
  "description": "...",
  "tags": ["MONITORING", "OBSERVABILITY"],
  "status": "active",
  "metadata": {
    "num": "01",
    "route": "/marketplace/modules/multi-agent-cockpit",
    "ctaLabel": "VIEW MODULE",
    "accessLevel": "operator"
  },
  "lastUpdated": "2026-07-06T00:00:00Z"
}
```

The raw validated registry behind that payload keeps the dist schema fields such as `num`, `title`, `cta_label`, `access_level`, `features`, and `access_instructions`.

## Routing and API Integration

The storefront now resolves through these routes and endpoints:

- `/` -> landing page
- `/marketplace` -> full module registry view
- `/marketplace?view=all|operator|public|restricted` -> filtered registry views
- `/marketplace/modules/:id` -> clean module detail routes
- `GET /api/modules`
- `GET /api/modules/:id`
- `GET /api/modules/status`
- `GET /api/modules/metadata`
- `GET /api/deliverables`
- `GET /api/deliverables/:id`
- `GET /api/deliverables/download?id=:id`
- `POST /api/identity/resolve`
- `POST /api/identity/create`
- `POST /api/engagements/create`

`server.js` also now honors the dist deployment metadata redirects locally:

- `/home` -> `/`
- `/book` -> Calendly
- `/report` -> `/marketplace/modules/ai-agent-threat-report`

## Dist Package Mismatches

The dist package and the current storefront still differ in a few important ways:

- The dist marketplace strip includes a classified coming-soon teaser card that does not map to a backend module object. It is preserved as a front-end-only card and documented as non-registry.
- The memo referenced React/TSX files such as `Hero.tsx`, `CatalogGrid.tsx`, and `MarketplaceModulePage.tsx`. This repo does not contain that source tree, so the integration was applied to the static equivalents instead.
- The dist package includes standalone `packages.html`, `deliverables.html`, and `contact.html` outputs. This repo still treats those as sections on the landing page rather than dedicated standalone routes.
- The operator headshot asset is still missing, so the storefront keeps a deliberate placeholder instead of inventing an image.

## Remaining Gaps

- Auth is still absent. The marketplace is not behind a `RequireAuth` gate in this repo.
- The Worker layer from the memo is not present here. The local Node server simulates the backend contract instead of proxying to a live `marketplace-tracking-backend` deployment.
- Cloudflare deployment metadata was referenced for redirects, headers, and environment conventions only. No deployment was performed.
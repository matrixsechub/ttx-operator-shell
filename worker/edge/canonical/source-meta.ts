/**
 * Canonical live mshops-public edge worker recovered from Cloudflare
 * (workers_get_worker_code, 2026-07-09).
 *
 * Source commit (Cloudflare Builds, NOT in local git):
 *   branch: feature/marketplace-enhancement-pass-2
 *   hash:   864add692ac5ad5948bb2be87922c93ad9f1dff0
 *   prior:  71b9cc2 — initial edge auth layer (workers/msh-ops-os-harness.js)
 *
 * Key behaviors:
 * - Operator routes: JWT required, NO ctx-hash binding
 * - Marketplace routes: JWT + ctx-hash binding (binding_mismatch → 403)
 * - POST /api/operator/auth issues operator JWT
 * - Proxies to ORIGIN_URL with CSP/XFO/nosniff on HTML
 */
export const CANONICAL_SOURCE = {
  branch: "feature/marketplace-enhancement-pass-2",
  commit: "864add692ac5ad5948bb2be87922c93ad9f1dff0",
  priorCommit: "71b9cc239cdd562d1c75fd61464bb3d51d88828f",
  workerBundle: "msh-ops-os-harness.js",
  recoveredAt: "2026-07-09T23:45:00Z",
  inLocalGit: false,
} as const;

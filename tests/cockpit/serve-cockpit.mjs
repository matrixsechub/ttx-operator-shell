/**
 * TEST-ONLY static server for the authenticated-cockpit browser proofs.
 * ---------------------------------------------------------------------------
 * Serves a built `dist/` and, for any non-file path, reproduces the production
 * Worker's SPA fallback by importing the REAL surface-routing decision from
 * `worker/surfaceRegistry.ts` (run via `node --import tsx`). So a deep-link /
 * refresh on `/dashboard/pearl-pilot` resolves to `/operator-shell.html`, and
 * `/login` resolves to `/auth-shell.html`, via the exact production functions
 * (`resolveHtmlSurface` + `surfaceShellPath`) — not a hand-copied approximation.
 *
 * This lets Playwright exercise direct-URL entry and refresh on the pilot route
 * against the REAL cockpit build (real cockpitRouter + real RequireAuth). It
 * adds NO auth behavior — authentication is represented entirely by the
 * browser-side fixture in the spec (a seeded token + a mocked `/api/auth/me`
 * response). The other shell HTMLs (ecosystem/auth/council and the storefront
 * under /app) are served as ordinary files for the cross-shell no-leak checks.
 *
 * Usage: COCKPIT_DIST=dist PORT=8815 node --import tsx tests/cockpit/serve-cockpit.mjs
 */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { resolveHtmlSurface, surfaceShellPath } from "../../worker/surfaceRegistry.ts";

const ROOT = path.resolve(process.env.COCKPIT_DIST ?? "dist");
const PORT = Number(process.env.PORT ?? 8815);

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

async function readFileIfPresent(filePath) {
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return null;
  } catch {
    return null;
  }
  return readFile(filePath);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = decodeURIComponent(url.pathname);

    // Guard against path traversal; resolve within ROOT only.
    const resolved = path.normalize(path.join(ROOT, pathname));
    if (!resolved.startsWith(ROOT)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }

    // 1. Real files (assets, the explicit shell HTMLs, /app/index.html, chunks).
    if (path.extname(pathname)) {
      const body = await readFileIfPresent(resolved);
      if (body) {
        res.writeHead(200, { "Content-Type": CONTENT_TYPES[path.extname(pathname)] ?? "application/octet-stream" });
        res.end(req.method === "HEAD" ? undefined : body);
        return;
      }
    }

    // 2. SPA fallback via the REAL production routing decision.
    const surface = resolveHtmlSurface(pathname);
    const shellPath = surfaceShellPath(surface); // e.g. "/operator-shell.html"
    const shellBody = await readFileIfPresent(path.join(ROOT, shellPath.replace(/^\//, "")));
    if (shellBody) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "X-Surface": surface });
      res.end(req.method === "HEAD" ? undefined : shellBody);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end(`shell for surface "${surface}" not found — build dist first`);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end(`server error: ${err?.message ?? err}`);
  }
});

server.listen(PORT, () => {
  console.log(`[serve-cockpit] ${ROOT} on http://localhost:${PORT} (SPA fallback via real resolveHtmlSurface)`);
});

/** Canonical public entry — sole UI authority after mshops.pages.dev decommission. */
export const CANONICAL_ENTRY = "https://ttx-operator-shell.sogellagepul.workers.dev";

/** Permanent redirect to canonical entry (path + query preserved). */
export function redirectToCanonicalEntry(request: Request): Response {
  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, CANONICAL_ENTRY);
  return Response.redirect(target.toString(), 301);
}

/** Gone response for decommissioned mshops-public surface. */
export function decommissionPublicSurface(request: Request): Response {
  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, CANONICAL_ENTRY);
  return new Response(
    JSON.stringify({
      error: "mshops.pages.dev decommissioned",
      redirect: target.toString(),
      canonical: CANONICAL_ENTRY,
    }),
    {
      status: 410,
      headers: {
        "Content-Type": "application/json",
        Location: target.toString(),
        "X-Decommission": "mshops-public",
        "X-Canonical-Entry": CANONICAL_ENTRY,
      },
    },
  );
}

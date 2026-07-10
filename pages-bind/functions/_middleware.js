const CANONICAL_ENTRY = "https://ttx-operator-shell.sogellagepul.workers.dev";

export async function onRequest(context) {
  const incoming = new URL(context.request.url);
  const target = new URL(incoming.pathname + incoming.search, CANONICAL_ENTRY);
  return Response.redirect(target.toString(), 301);
}

// Shared HTTP helpers for Worker route modules.
export function jsonResponse(payload: unknown, status = 200): Response {
  return Response.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

import type { FlywheelEvent } from "../../shared/flywheel/contracts";

const SENSITIVE = /(authorization|token|secret|password|prompt|credential|cookie|client.?content)/i;
export function sanitizeTelemetry(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[TRUNCATED]";
  if (typeof value === "string") return value.slice(0, 512).replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]");
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeTelemetry(item, depth + 1));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 50).map(([key, item]) => [key, SENSITIVE.test(key) ? "[REDACTED]" : sanitizeTelemetry(item, depth + 1)]));
  return value;
}

export function buildFlywheelEvent(fields: Omit<FlywheelEvent, "eventId" | "timestamp" | "metadata"> & { metadata?: Record<string, unknown> }): FlywheelEvent {
  return { ...fields, eventId: crypto.randomUUID(), timestamp: new Date().toISOString(), metadata: sanitizeTelemetry(fields.metadata ?? {}) as Record<string, unknown> };
}

export async function mirrorFlywheelEvent(env: { TTX_STATE: KVNamespace }, event: FlywheelEvent): Promise<void> {
  const eventKey = `flywheel:event:${event.tenantId}:${event.eventId}`;
  const indexKey = `flywheel:events:${event.tenantId}:${event.runId}`;
  const raw = await env.TTX_STATE.get(indexKey);
  const ids = raw ? (JSON.parse(raw) as string[]) : [];
  ids.unshift(event.eventId);
  await Promise.all([
    env.TTX_STATE.put(eventKey, JSON.stringify(event), { expirationTtl: 60 * 60 * 24 * 30 }),
    env.TTX_STATE.put(indexKey, JSON.stringify(ids.slice(0, 200)), { expirationTtl: 60 * 60 * 24 * 30 }),
  ]);
}

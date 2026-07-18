export type IdempotencyRecord = { digest: string; response: Record<string, unknown> };
export type IdempotencyDecision =
  | { kind: "new" }
  | { kind: "replay"; response: Record<string, unknown> }
  | { kind: "conflict"; code: "GOVERNANCE_DUPLICATE_COMMAND" };

export function resolveIdempotency(existing: IdempotencyRecord | null, digest: string): IdempotencyDecision {
  if (!existing) return { kind: "new" };
  if (existing.digest === digest) return { kind: "replay", response: existing.response };
  return { kind: "conflict", code: "GOVERNANCE_DUPLICATE_COMMAND" };
}

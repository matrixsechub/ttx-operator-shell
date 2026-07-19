export type CommandIdempotencyState = "accepted" | "awaiting_approval" | "completed" | "denied";

export type IdempotencyRecord = {
  digest: string;
  response: Record<string, unknown>;
  state?: CommandIdempotencyState;
};

export type IdempotencyDecision =
  | { kind: "new" }
  | { kind: "replay"; response: Record<string, unknown> }
  | { kind: "in_progress"; response: Record<string, unknown>; state: CommandIdempotencyState }
  | { kind: "conflict"; code: "GOVERNANCE_DUPLICATE_COMMAND" };

/**
 * Replay only completed (or denied) outcomes. In-flight accepted/awaiting_approval
 * must not be treated as successful completed replays with empty responses.
 */
export function resolveIdempotency(existing: IdempotencyRecord | null, digest: string): IdempotencyDecision {
  if (!existing) return { kind: "new" };
  if (existing.digest !== digest) return { kind: "conflict", code: "GOVERNANCE_DUPLICATE_COMMAND" };

  const state = existing.state ?? "completed";
  if (state === "completed" || state === "denied") {
    return { kind: "replay", response: existing.response };
  }
  return { kind: "in_progress", response: existing.response, state };
}

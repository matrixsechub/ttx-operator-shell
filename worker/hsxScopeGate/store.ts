import type { HsxScopeGateDecision, HsxScopeGatePacket, HsxScopeGateTelemetryEvent } from "./types";

const PREFIX = "hsx:scope-gate:v1";
const TTL_SECONDS = 60 * 60 * 24 * 90;

export interface HsxScopeGateStoreEnv {
  TTX_STATE: KVNamespace;
}

export async function getScopeGateDecisionForPacket(
  env: HsxScopeGateStoreEnv,
  packetId: string,
): Promise<HsxScopeGateDecision | null> {
  const raw = await env.TTX_STATE.get(`${PREFIX}:packet:${packetId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as HsxScopeGateDecision;
  } catch {
    return null;
  }
}

export async function persistScopeGateDecision(
  env: HsxScopeGateStoreEnv,
  packet: HsxScopeGatePacket | null,
  decision: HsxScopeGateDecision,
): Promise<void> {
  const event: HsxScopeGateTelemetryEvent = {
    event_id: crypto.randomUUID(),
    name: decision.outcome === "approved" ? "hsx.scope_gate.approved" : "hsx.scope_gate.denied",
    timestamp: decision.decided_at,
    packet_id: decision.packet_id,
    decision_id: decision.decision_id,
    correlation_id: decision.correlation_id,
    actor_id: packet?.actor.id ?? "invalid",
    target: packet ? `${packet.target.system}:${packet.target.resource}` : "invalid",
    action_type: packet?.action.type ?? "invalid",
    action_class: packet?.action.class ?? "C0",
    risk_score: decision.risk.score,
    risk_tier: decision.risk.tier,
    outcome: decision.outcome,
    reason_code: decision.reason_code,
    beacon_hash: decision.beacon_hash,
  };
  const serialized = JSON.stringify(decision);
  await Promise.all([
    env.TTX_STATE.put(`${PREFIX}:decision:${decision.decision_id}`, serialized, { expirationTtl: TTL_SECONDS }),
    env.TTX_STATE.put(`${PREFIX}:${decision.outcome}:${decision.decision_id}`, serialized, { expirationTtl: TTL_SECONDS }),
    env.TTX_STATE.put(`${PREFIX}:packet:${decision.packet_id}`, serialized, { expirationTtl: TTL_SECONDS }),
    env.TTX_STATE.put(`${PREFIX}:telemetry:${event.event_id}`, JSON.stringify(event), { expirationTtl: TTL_SECONDS }),
  ]);
  console.log(JSON.stringify(event));
}

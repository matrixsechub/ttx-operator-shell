import { getAgentGovernanceContextFor } from "../msh-ops/agent/initAgentGovernance";
import { getCodexManifestSnapshot } from "./codex/manifestHash";
import { recordAuditEvent, type AuditDbEnv } from "./governance/auditStore";

export type PrismTriageAuditAction =
  | "prism.triage.generated"
  | "prism.triage.disposition"
  | "prism.proposal.generated"
  | "prism.proposal.regenerated"
  | "prism.triage.invariant_rejected";

export async function recordPrismTriageAuditEvent(
  env: AuditDbEnv,
  fields: {
    action: PrismTriageAuditAction;
    actorId: string;
    resourceType: "triage" | "proposal";
    resourceId: string;
    sourceAuditId: string;
    priorState?: string;
    nextState?: string;
    evidenceHash?: string;
    result?: "success" | "failure" | "denied" | "blocked";
  },
): Promise<void> {
  const codex = await getCodexManifestSnapshot();
  const beacon = getAgentGovernanceContextFor("PRISM_UIUX_AGENT_V1");

  await recordAuditEvent(env, {
    event_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    actor_type: "operator",
    actor_id: fields.actorId,
    action_class: "C1",
    system_target: "prism_uiux_triage",
    beacon_hash: beacon.integrityHash,
    codex_hash: codex.manifestHash,
    trace_id: crypto.randomUUID(),
    event_type: fields.action,
    risk_score: 0,
    result: fields.result ?? "success",
    evidence_hash: fields.evidenceHash,
    input_refs: [fields.sourceAuditId, fields.resourceType, fields.resourceId],
    output_refs: fields.priorState && fields.nextState ? [fields.priorState, fields.nextState] : undefined,
  });
}

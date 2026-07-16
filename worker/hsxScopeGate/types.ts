import type { ActionClass, RuntimeEnvironment } from "../governance/types";

export type HsxActorType = "agent" | "operator" | "system";
export type HsxOperation = "read" | "create" | "update" | "delete" | "execute" | "deploy";
export type HsxRiskTier = "low" | "medium" | "high" | "critical";

export interface HsxScopeGatePacket {
  version: "hsx.scope-gate.v1";
  packet_id: string;
  correlation_id: string;
  issued_at: string;
  actor: {
    id: string;
    type: HsxActorType;
    roles: string[];
  };
  target: {
    system: string;
    resource: string;
    environment: RuntimeEnvironment;
    tenant_id?: string;
  };
  action: {
    type: string;
    class: ActionClass;
    operation: HsxOperation;
    permissions: string[];
    payload: Record<string, unknown>;
  };
  engagement: {
    id: string;
    scope_id: string;
    authorized_targets: string[];
    allowed_actions: string[];
    allowed_permissions: string[];
    expires_at: string;
  };
  evidence: Array<{
    type: string;
    ref: string;
    sha256?: string;
    observed_at: string;
  }>;
  approval?: {
    proposal_id: string;
    approval_id: string;
  };
}

export interface HsxRiskAssessment {
  score: number;
  tier: HsxRiskTier;
  factors: string[];
  evidence_required: boolean;
}

export interface HsxScopeGateCheck {
  name: "schema" | "freshness" | "beacon" | "target" | "action" | "permissions" | "scope" | "evidence" | "approval";
  passed: boolean;
  code: string;
}

export interface HsxScopeGateDecision {
  version: "hsx.scope-gate.decision.v1";
  decision_id: string;
  packet_id: string;
  correlation_id: string;
  decided_at: string;
  outcome: "approved" | "denied";
  reason_code: string;
  risk: HsxRiskAssessment;
  checks: HsxScopeGateCheck[];
  beacon_hash: string | null;
  approval_verified: boolean;
  expires_at: string;
}

export interface HsxScopeGateTelemetryEvent {
  event_id: string;
  name: "hsx.scope_gate.approved" | "hsx.scope_gate.denied";
  timestamp: string;
  packet_id: string;
  decision_id: string;
  correlation_id: string;
  actor_id: string;
  target: string;
  action_type: string;
  action_class: ActionClass;
  risk_score: number;
  risk_tier: HsxRiskTier;
  outcome: "approved" | "denied";
  reason_code: string;
  beacon_hash: string | null;
}

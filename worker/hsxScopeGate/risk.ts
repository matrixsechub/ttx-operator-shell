import type { HsxRiskAssessment, HsxScopeGatePacket } from "./types";

const CLASS_RISK = { C0: 5, C1: 15, C2: 30, C3: 45, C4: 60, C5: 75, C6: 90 } as const;
const OPERATION_RISK = { read: 0, create: 5, update: 10, delete: 20, execute: 15, deploy: 25 } as const;
const PRIVILEGED_PERMISSION = /(admin|billing|credential|deploy|secret|security|write:prod)/i;

export function assessHsxActionRisk(packet: HsxScopeGatePacket): HsxRiskAssessment {
  const factors = [`action_class:${packet.action.class}`, `operation:${packet.action.operation}`];
  let score = CLASS_RISK[packet.action.class] + OPERATION_RISK[packet.action.operation];
  if (packet.target.environment === "production") {
    score += 15;
    factors.push("production_target");
  }
  const privileged = packet.action.permissions.filter((permission) => PRIVILEGED_PERMISSION.test(permission)).length;
  if (privileged > 0) {
    score += Math.min(privileged * 5, 15);
    factors.push("privileged_permissions");
  }
  score = Math.min(score, 100);
  const tier = score >= 80 ? "critical" : score >= 70 ? "high" : score >= 50 ? "medium" : "low";
  return { score, tier, factors, evidence_required: score >= 70 };
}

export function requiredEvidenceTypes(packet: HsxScopeGatePacket, risk: HsxRiskAssessment): string[] {
  if (!risk.evidence_required) return [];
  const required = ["target_authorization", "engagement_scope", "risk_assessment"];
  if (packet.action.operation !== "read") required.push("rollback_plan");
  return required;
}

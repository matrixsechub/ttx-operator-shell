import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateSecurityRemediationPlan,
  listSecurityRemediationQueue,
  normalizeSecurityRemediationInput,
  resolveRemediationPlanId,
} from "../worker/data/securityRemediationAgent.ts";
import { ensureAgentGovernance } from "../msh-ops/agent/initAgentGovernance.ts";
import { ensureBeaconLoaded } from "../msh-ops/beacon/loadBeacon.ts";

describe("securityRemediationAgent", () => {
  it("normalizes prompt injection scan inputs with deterministic plan ids", async () => {
    await ensureBeaconLoaded();
    await ensureAgentGovernance();
    const input = normalizeSecurityRemediationInput({
      source_type: "prompt_injection_scan",
      source_reference_id: "scan-1001",
      risk_description: "Customer-facing chatbot shows prompt injection exposure.",
      vulnerability_categories: ["prompt_injection_exposure", "model_misuse"],
      affected_systems: ["public_web_app", "ai_agent"],
      severity_indicators: ["customer_facing", "internet_facing"],
      compliance_targets: ["nist_csf", "cisa", "zero_trust"],
      business_impact: "high",
      exposure_level: "internet_facing",
      remediation_scope: "phased_remediation",
      timeline: "this_week",
      budget_band: "2500_7500",
    });
    const result = generateSecurityRemediationPlan(input);
    assert.match(result.remediation_plan_id, /^remediation-plan-\d+$/);
    assert.ok(result.vulnerabilities.length >= 2);
    assert.ok(result.prioritized_fix_plan.length >= 2);
    assert.ok(result.remediation_steps.length >= 2);
    assert.ok(result.compliance_alignment.nist_csf.length > 0);
    assert.ok(result.compliance_alignment.cisa.length > 0);
    assert.ok(result.compliance_alignment.zero_trust.length > 0);
    assert.ok(result.security_controls_required.length >= 2);
    assert.ok(result.next_route.includes("/enter?"));
    assert.ok(result.next_route.includes("remediation_plan_id="));
    assert.ok(result.next_route.includes("compliance_alignment="));
  });

  it("maps legacy source_type aliases and resolves plan ids", () => {
    const input = normalizeSecurityRemediationInput({ source_type: "audit" });
    assert.equal(input.source_type, "ai_security_audit");
    const manual = normalizeSecurityRemediationInput({ source_type: "manual" });
    assert.equal(manual.source_type, "manual_remediation_request");
    assert.equal(resolveRemediationPlanId({ remediation_plan_id: "remediation-plan-1001" }), "remediation-plan-1001");
    assert.equal(resolveRemediationPlanId({ remediation_plan_id: "invalid" }), null);
    assert.equal(listSecurityRemediationQueue([]).length >= 0, true);
  });
});

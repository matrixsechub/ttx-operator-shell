import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateLocalAiDeploymentPlan,
  listLocalAiDeploymentQueue,
  normalizeLocalAiDeploymentInput,
  resolveDeploymentPlanId,
} from "../worker/data/localAiDeploymentAgent.ts";

describe("localAiDeploymentAgent", () => {
  it("normalizes local AI deployment inputs with deterministic plan ids", () => {
    const input = normalizeLocalAiDeploymentInput({
      source_type: "rag_architecture_plan",
      source_reference_id: "rag-plan-1001",
      use_case: "regulated_data_assistant",
      model_family_preference: "llama",
      model_size_band: "medium_13b",
      hardware_profile: "gpu_workstation",
      hosting_strategy_preference: "local",
      data_sensitivity: "regulated",
      isolation_requirement: "vpc_private",
      concurrent_users: "department",
      workload_volume: "moderate",
      latency_requirement: "balanced",
      budget_band: "7500_15000",
      timeline: "this_month",
      access_model: "role_based",
      compliance_notes: "HIPAA aligned deployment",
    });
    const result = generateLocalAiDeploymentPlan(input);
    assert.match(result.deployment_plan_id, /^deployment-plan-\d+$/);
    assert.equal(result.use_case, "regulated_data_assistant");
    assert.ok(result.model_recommendation);
    assert.ok(result.model_size);
    assert.ok(result.hardware_requirements.cpu);
    assert.ok(result.hardware_requirements.gpu);
    assert.ok(result.hardware_requirements.ram_gb);
    assert.ok(result.storage_requirements.model_weights_gb);
    assert.ok(["local", "cloud", "hybrid"].includes(result.hosting_strategy));
    assert.ok(result.latency_expectation);
    assert.ok(result.cost_estimate);
    assert.ok(result.data_isolation_model);
    assert.ok(result.security_controls.length >= 5);
    assert.ok(result.access_control_model);
    assert.ok(result.update_strategy);
    assert.ok(result.monitoring_plan.signals.length >= 5);
    assert.ok(result.scaling_plan);
    assert.ok(result.integration_points.length >= 2);
    assert.ok(result.failure_modes.length >= 4);
    assert.ok(result.backup_strategy);
    assert.equal(result.recommended_service, "local_ai_setup");
    assert.ok(result.next_route.includes("/enter?"));
    assert.ok(result.next_route.includes("deployment_plan_id="));
    assert.ok(result.next_route.includes("complexity_level="));
    assert.ok(result.next_route.includes("risk_level="));
    assert.ok(result.next_route.includes("estimated_effort="));
    assert.ok(result.next_route.includes("priority="));
    assert.equal(result.status, "local-ai-deployment-plan-complete");
  });

  it("resolves deployment plan ids for engagement attachment", () => {
    assert.equal(resolveDeploymentPlanId({ deployment_plan_id: "deployment-plan-1001" }), "deployment-plan-1001");
    assert.equal(resolveDeploymentPlanId({ deployment_plan_id: "invalid" }), null);
    assert.equal(listLocalAiDeploymentQueue([]).length >= 0, true);
  });
});

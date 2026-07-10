import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import { generateAiAgentBuildSpec, normalizeAiAgentBuildInput } from "../../../worker/data/aiAgentBuilderAgent.ts";
import { generateSecurityRemediationPlan, normalizeSecurityRemediationInput } from "../../../worker/data/securityRemediationAgent.ts";
import { runWildcardDiscoveryScan } from "../../../worker/wildcardAdvancement.ts";
import { handleFulfillmentAgentApi } from "../../../worker/fulfillmentAgentRoutes.ts";
import { ensureAgentGovernance } from "../../../msh-ops/agent/initAgentGovernance.ts";
import { ensureBeaconLoaded } from "../../../msh-ops/beacon/loadBeacon.ts";

const sampleBuildPayload = {
  agent_goal: "intake_assistant",
  agent_autonomy_level: "draft_only",
  user_interaction_channel: "operator_dashboard",
  tools_needed: ["gmail"],
  data_types: ["contact_info"],
  output_modes: ["task_list"],
  human_approval_required: "before_external_send",
  risk_signals: ["customer_data"],
  memory_requirement: "project_memory",
  deployment_environment: "private_operator_dashboard",
  volume_level: "medium",
  timeline: "this_month",
  budget_band: "7500_15000",
};

const sampleRemediationPayload = {
  source_type: "ai_security_audit",
  vulnerability_categories: ["prompt_injection"],
  affected_systems: ["public_chatbot"],
  severity_indicators: ["high"],
  compliance_targets: ["nist_csf"],
  business_impact: "medium",
  exposure_level: "external_facing",
  remediation_scope: "policy_and_controls",
  timeline: "this_month",
  budget_band: "2500_5000",
  operator_review_required: "always",
};

describe("agent beacon initialization", () => {
  before(async () => {
    await ensureBeaconLoaded();
    await ensureAgentGovernance();
  });

  it("includes northstar_alignment in AI agent build specs", () => {
    const input = normalizeAiAgentBuildInput(sampleBuildPayload);
    const result = generateAiAgentBuildSpec(input);
    assert.equal(result.northstar_alignment?.beacon_id, "BEACON::NORTHSTAR");
    assert.equal(result.northstar_alignment?.safe_mode, false);
    assert.ok(result.northstar_alignment?.strategic_axis.length === 5);
  });

  it("includes northstar_alignment in security remediation plans", () => {
    const input = normalizeSecurityRemediationInput(sampleRemediationPayload);
    const result = generateSecurityRemediationPlan(input);
    assert.equal(result.northstar_alignment?.beacon_id, "BEACON::NORTHSTAR");
    assert.equal(result.northstar_alignment?.axis, "TRUST");
  });

  it("includes northstar_alignment in wildcard discovery scans", () => {
    const scan = runWildcardDiscoveryScan({ includeSiteMap: false });
    assert.equal(scan.northstar_alignment.beacon_id, "BEACON::NORTHSTAR");
    assert.equal(scan.northstar_alignment.axis, "WILDCARD_INNOVATION");
  });
});

describe("fulfillment route autonomy gate", () => {
  before(async () => {
    await ensureBeaconLoaded();
    await ensureAgentGovernance();
  });

  it("escalates queue writes without operator approval", async () => {
    const request = new Request("https://example.com/api/ai-agent-build-spec-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleBuildPayload),
    });
    const response = await handleFulfillmentAgentApi(request, "/api/ai-agent-build-spec-generate", "POST");
    assert.ok(response);
    assert.equal(response.status, 409);
    const body = (await response.json()) as { code?: string };
    assert.equal(body.code, "BEACON_AUTONOMY_ESCALATE");
  });

  it("allows queue writes when operator approval is present", async () => {
    const request = new Request("https://example.com/api/ai-agent-build-spec-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...sampleBuildPayload, operator_approval: true }),
    });
    const response = await handleFulfillmentAgentApi(request, "/api/ai-agent-build-spec-generate", "POST");
    assert.ok(response);
    assert.equal(response.status, 200);
    const body = (await response.json()) as { northstar_alignment?: { beacon_id: string } };
    assert.equal(body.northstar_alignment?.beacon_id, "BEACON::NORTHSTAR");
  });
});

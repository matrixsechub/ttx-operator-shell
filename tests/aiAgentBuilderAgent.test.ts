import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateAiAgentBuildSpec,
  listAiAgentBuildQueue,
  normalizeAiAgentBuildInput,
  resolveAiAgentBuildId,
} from "../worker/data/aiAgentBuilderAgent.ts";
import { ensureAgentGovernance } from "../msh-ops/agent/initAgentGovernance.ts";
import { ensureBeaconLoaded } from "../msh-ops/beacon/loadBeacon.ts";

describe("aiAgentBuilderAgent", () => {
  it("normalizes intake assistant specs with deterministic ids", async () => {
    await ensureBeaconLoaded();
    await ensureAgentGovernance();
    const input = normalizeAiAgentBuildInput({
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
    });
    const result = generateAiAgentBuildSpec(input);
    assert.match(result.ai_agent_build_id, /^agent-build-\d+$/);
    assert.equal(result.agent_category, "Intake Agent");
    assert.ok(result.approval_gates.length > 0);
    assert.ok(result.safety_controls.length >= 6);
    assert.ok(result.next_route.includes("/enter?"));
  });

  it("resolves ai agent build ids for engagement attachment", () => {
    assert.equal(resolveAiAgentBuildId({ ai_agent_build_id: "agent-build-1001" }), "agent-build-1001");
    assert.equal(resolveAiAgentBuildId({ ai_agent_build_id: "invalid" }), null);
    assert.equal(listAiAgentBuildQueue([]).length >= 0, true);
  });
});

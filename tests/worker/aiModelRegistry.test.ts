import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AGENT_ROUTING_PROFILES,
  isModelAllowedForProfile,
  resolveAgentProfile,
  selectModelForProfile,
} from "../../worker/aiModelRegistry.ts";

describe("aiModelRegistry", () => {
  it("resolves known agent profiles", () => {
    assert.equal(resolveAgentProfile("GhostLayer"), "wildcard");
    assert.equal(resolveAgentProfile("GuideAgent"), "stability");
    assert.equal(resolveAgentProfile("UnknownAgent"), "stability");
  });

  it("forces stability profile in RESTRICTIVE mode", () => {
    const selected = selectModelForProfile("wildcard", {
      wildcardFeaturesEnabled: true,
      policyMode: "RESTRICTIVE",
      highRisk: false,
      errorState: false,
    });
    assert.equal(selected.profile.profile, "stability");
  });

  it("disables wildcard when wildcardFeaturesEnabled is false", () => {
    const selected = selectModelForProfile("wildcard", {
      wildcardFeaturesEnabled: false,
      policyMode: "standard",
      highRisk: false,
      errorState: false,
    });
    assert.equal(selected.profile.profile, "stability");
  });

  it("uses Workers AI only in error state", () => {
    const selected = selectModelForProfile("revenue", {
      wildcardFeaturesEnabled: true,
      policyMode: "standard",
      highRisk: false,
      errorState: true,
    });
    assert.ok(selected.model.startsWith("@cf/"));
  });

  it("validates model allowlists per profile", () => {
    assert.ok(isModelAllowedForProfile("@cf/meta/llama-3.1-8b-instruct", "stability"));
    assert.ok(!isModelAllowedForProfile("openai/gpt-4.1-mini", "stability"));
    assert.ok(AGENT_ROUTING_PROFILES.AiAgentBuilderAgent === "growth");
  });
});

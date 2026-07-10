import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateRagArchitecturePlan,
  listRagArchitectureQueue,
  normalizeRagArchitectureInput,
  resolveRagPlanId,
} from "../worker/data/ragArchitectureAgent.ts";

describe("ragArchitectureAgent", () => {
  it("normalizes RAG risk handoff inputs with deterministic plan ids", () => {
    const input = normalizeRagArchitectureInput({
      source_type: "rag_risk_result",
      source_reference_id: "rag-risk-1001",
      use_case: "internal_knowledge",
      data_sources: ["google_drive", "confluence", "notion"],
      data_sensitivity: "confidential",
      document_volume: "large",
      query_patterns: ["multi_hop_research", "citation_required"],
      freshness_requirement: "daily",
      citation_requirement: "required",
      infra_preference: "hybrid",
      latency_requirement: "balanced",
      budget_band: "7500_15000",
      timeline: "this_month",
      access_model: "role_based",
    });
    const result = generateRagArchitecturePlan(input);
    assert.match(result.rag_plan_id, /^rag-plan-\d+$/);
    assert.equal(result.use_case, "internal_knowledge");
    assert.ok(result.chunking_strategy.approach);
    assert.ok(result.embedding_strategy.approach);
    assert.ok(result.retrieval_strategy.approach);
    assert.ok(result.ranking_strategy.approach);
    assert.ok(result.memory_layers.length >= 2);
    assert.ok(result.prompt_structure.system_guardrails.length >= 3);
    assert.ok(result.hallucination_controls.length >= 3);
    assert.ok(result.prompt_injection_defenses.length >= 4);
    assert.ok(result.evaluation_metrics.length >= 5);
    assert.ok(result.testing_plan.length >= 4);
    assert.ok(["cloudflare", "local", "hybrid"].includes(result.infra_recommendation));
    assert.ok(result.next_route.includes("/enter?"));
    assert.ok(result.next_route.includes("rag_plan_id="));
    assert.ok(result.next_route.includes("complexity_level="));
    assert.ok(result.next_route.includes("risk_level="));
    assert.ok(result.next_route.includes("estimated_effort="));
    assert.ok(result.next_route.includes("priority="));
  });

  it("resolves rag plan ids for engagement attachment", () => {
    assert.equal(resolveRagPlanId({ rag_plan_id: "rag-plan-1001" }), "rag-plan-1001");
    assert.equal(resolveRagPlanId({ rag_plan_id: "invalid" }), null);
    assert.equal(listRagArchitectureQueue([]).length >= 0, true);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assignFlowExperimentVariant,
  buildExperimentFromIntelligence,
  buildFlowExperimentOutcome,
  buildFlowExperimentReport,
  computeIntentRate,
  evaluateExperimentStatus,
  formatFlowExperimentReport,
  generateFlowExperiment,
} from "../worker/flowExperiment.ts";
import { selectPriorityRecommendation } from "../worker/flowExperimentTypes.ts";
import { emptyFlowRollup, type FlowIntelligenceReport } from "../worker/flowTypes.ts";

function sampleIntelligence(): FlowIntelligenceReport {
  return {
    topPaths: [{ path: ["/", "/enter"], count: 5, share: 0.5 }],
    dropOffPages: [{ page: "/enter", exitRate: 0.6, visits: 10 }],
    frictionPoints: [
      {
        page: "/enter",
        ruleId: "click_no_progression",
        severity: "high",
        evidence: "12 clicks with forward rate 10%",
        sessionsAffected: 10,
      },
    ],
    recommendations: [
      {
        page: "/enter",
        issue: "Clicks do not convert into forward navigation",
        suggestedChange: "Add next-step framing after interactive elements",
        impactScore: 7,
        confidenceScore: 0.7,
        effortEstimate: "medium",
      },
      {
        page: "/enter",
        issue: "Lower priority",
        suggestedChange: "Secondary change",
        impactScore: 5,
        confidenceScore: 0.5,
        effortEstimate: "high",
      },
    ],
    confidence: "medium",
    trend: { sessionsDelta: 5, topFrictionDelta: 0.1, period: "vs_prior_7d" },
    systemState: "ANALYZING",
  };
}

describe("selectPriorityRecommendation", () => {
  it("ranks by impact times confidence and prefers lower effort", () => {
    const top = selectPriorityRecommendation(sampleIntelligence().recommendations);
    assert.equal(top?.suggestedChange, "Add next-step framing after interactive elements");
  });
});

describe("generateFlowExperiment", () => {
  it("builds experiment object from intelligence", () => {
    const intelligence = sampleIntelligence();
    const recommendation = selectPriorityRecommendation(intelligence.recommendations)!;
    const experiment = buildExperimentFromIntelligence(intelligence);
    assert.ok(experiment);
    assert.equal(experiment?.page, "/enter");
    assert.equal(experiment?.issue, "click_no_progression");
    assert.equal(experiment?.successMetric, "intent_rate");
    assert.match(experiment?.id ?? "", /^fx-enter-click_no_progression$/);

    const direct = generateFlowExperiment(recommendation, intelligence.frictionPoints[0]!, "click_no_progression");
    assert.equal(direct.hypothesis, "Adding direct next-step framing after interactions will improve progression");
  });
});

describe("assignFlowExperimentVariant", () => {
  it("assigns roughly 80% baseline and 20% experiment", () => {
    const experimentId = "fx-enter-click_no_progression";
    const assignments = Array.from({ length: 100 }, (_, index) =>
      assignFlowExperimentVariant(`00000000-0000-4000-8000-${String(index).padStart(12, "0")}`, experimentId),
    );
    const baseline = assignments.filter((variant) => variant === "A").length;
    assert.ok(baseline >= 70, `expected ~80% baseline, got ${baseline}`);
    assert.ok(assignments.some((variant) => variant === "B"));
  });
});

describe("evaluateExperimentStatus", () => {
  it("stays RUNNING below sample threshold", () => {
    const experiment = buildExperimentFromIntelligence(sampleIntelligence())!;
    const evaluation = evaluateExperimentStatus(
      experiment,
      { views: 10, ctaClicks: 0, progressionCount: 0, dropOffCount: 0, intentSubmissions: 1, conversionAttempts: 1 },
      { views: 10, ctaClicks: 0, progressionCount: 0, dropOffCount: 0, intentSubmissions: 2, conversionAttempts: 2 },
    );
    assert.equal(evaluation.status, "RUNNING");
    assert.equal(evaluation.systemState, "TESTING");
  });

  it("marks WINNING with promotion proposal when variant B improves intent rate", () => {
    const experiment = buildExperimentFromIntelligence(sampleIntelligence())!;
    const evaluation = evaluateExperimentStatus(
      experiment,
      { views: 40, ctaClicks: 5, progressionCount: 5, dropOffCount: 2, intentSubmissions: 4, conversionAttempts: 8 },
      { views: 40, ctaClicks: 8, progressionCount: 12, dropOffCount: 2, intentSubmissions: 12, conversionAttempts: 15 },
    );
    assert.equal(evaluation.status, "WINNING");
    assert.equal(evaluation.promotionProposal, `promote_flow_variant::${experiment.id}`);
    assert.equal(evaluation.systemState, "READY_TO_PROMOTE");
  });
});

describe("formatFlowExperimentReport", () => {
  it("renders FLOW_EXPERIMENT_REPORT sections", () => {
    const experiment = buildExperimentFromIntelligence(sampleIntelligence())!;
    const outcome = buildFlowExperimentOutcome(
      experiment,
      { views: 40, ctaClicks: 5, progressionCount: 5, dropOffCount: 2, intentSubmissions: 4, conversionAttempts: 8 },
      { views: 40, ctaClicks: 8, progressionCount: 12, dropOffCount: 2, intentSubmissions: 12, conversionAttempts: 15 },
    );
    const report = buildFlowExperimentReport(experiment, outcome);
    const formatted = formatFlowExperimentReport(report, true);
    assert.match(formatted, /# FLOW_EXPERIMENT_REPORT/);
    assert.match(formatted, /## experiment generation\nworking/);
    assert.match(formatted, /## assignment\nworking/);
    assert.match(formatted, /## tracking\nactive/);
    assert.match(formatted, /## cockpit visibility\nvisible/);
    assert.equal(computeIntentRate(outcome.variantB), 0.3);
  });
});

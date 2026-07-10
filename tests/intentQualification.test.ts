import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAdvisoryProposals,
  buildIntentQualificationReport,
  classifyIntentType,
  formatIntentQualificationReport,
  qualifyCapturedIntent,
  routeQualifiedIntent,
  scoreIntentQualification,
} from "../worker/intentQualification.ts";
import { emptyQualificationRollup } from "../worker/intentQualificationTypes.ts";
import type { IntentCaptureRecord } from "../worker/intentCaptureTypes.ts";

function sampleCapture(overrides: Partial<IntentCaptureRecord> = {}): IntentCaptureRecord {
  return {
    captureId: "intent-1000-abc12345",
    sessionId: "00000000-0000-4000-8000-000000000001",
    source: "direct",
    page: "/enter",
    uiMode: "ENGAGED",
    intent: "Build an intake agent for customer onboarding",
    category: "ai_agent",
    interactionDepth: { dwellMs: 45_000, scrollDepth: 0.6, clicks: 3 },
    timestamp: "2026-07-10T12:00:00.000Z",
    previewGenerated: true,
    ...overrides,
  };
}

describe("classifyIntentType", () => {
  it("maps capture category to intent type with high confidence", () => {
    const result = classifyIntentType({ record: sampleCapture({ category: "automation" }) });
    assert.equal(result.intentType, "automation_build");
    assert.ok(result.classificationConfidence >= 0.9);
  });

  it("classifies security language when category is absent", () => {
    const result = classifyIntentType({
      record: sampleCapture({
        category: undefined,
        intent: "Need a SOC2 compliance security audit for our Cloudflare Workers deployment",
      }),
    });
    assert.equal(result.intentType, "security_audit");
    assert.ok(result.classificationConfidence >= 0.5);
  });

  it("falls back to unknown for low-signal intents", () => {
    const result = classifyIntentType({
      record: sampleCapture({ category: undefined, intent: "hello there" }),
    });
    assert.equal(result.intentType, "unknown");
    assert.ok(result.classificationConfidence < 0.5);
  });

  it("detects enterprise readiness language", () => {
    const result = classifyIntentType({
      record: sampleCapture({
        category: undefined,
        intent: "Enterprise governance readiness review for regulated operator program",
      }),
    });
    assert.equal(result.intentType, "enterprise_readiness");
  });
});

describe("scoreIntentQualification", () => {
  it("scores clear operational pain higher than vague text", () => {
    const clear = classifyIntentType({ record: sampleCapture() });
    const vague = classifyIntentType({
      record: sampleCapture({ intent: "help", category: undefined }),
    });
    const clearScore = scoreIntentQualification({ record: sampleCapture() }, clear);
    const vagueScore = scoreIntentQualification(
      { record: sampleCapture({ intent: "help", category: undefined }) },
      vague,
    );
    assert.ok(clearScore.totalScore > vagueScore.totalScore);
    assert.ok(clearScore.breakdown.problemClarity > vagueScore.breakdown.problemClarity);
  });

  it("assigns priority bands from total score", () => {
    const classification = classifyIntentType({ record: sampleCapture() });
    const scored = scoreIntentQualification({ record: sampleCapture() }, classification);
    assert.ok(["low", "medium", "high"].includes(scored.priority));
    assert.ok(scored.totalScore >= 0 && scored.totalScore <= 100);
  });
});

describe("routeQualifiedIntent", () => {
  it("routes ai agent intents to ai-agent-builder", () => {
    const record = sampleCapture();
    const input = { record };
    const classification = classifyIntentType(input);
    const { totalScore, priority } = scoreIntentQualification(input, classification);
    const routing = routeQualifiedIntent(input, classification, totalScore, priority);
    assert.match(routing.recommendedRoute, /\/apps\/ai-agent-builder/);
    assert.equal(routing.routeKind, "builder");
  });

  it("routes unknown low-priority intents to nurture queue", () => {
    const record = sampleCapture({ category: undefined, intent: "hi" });
    const input = { record };
    const classification = classifyIntentType(input);
    const { totalScore, priority } = scoreIntentQualification(input, classification);
    const routing = routeQualifiedIntent(input, classification, totalScore, priority);
    assert.equal(routing.routeKind, "nurture");
    assert.match(routing.recommendedRoute, /\/enter/);
  });

  it("routes high-value ambiguous automation to operator review when confidence is low", () => {
    const record = sampleCapture({
      category: undefined,
      intent: "automate repetitive onboarding workflow tasks for my team asap",
      interactionDepth: { dwellMs: 90_000, scrollDepth: 0.8, clicks: 6 },
    });
    const input = { record };
    const classification = classifyIntentType(input);
    const { totalScore, priority } = scoreIntentQualification(input, classification);
    const routing = routeQualifiedIntent(input, classification, totalScore, priority);
    assert.equal(classification.intentType, "automation_build");
    if (priority === "high" && classification.classificationConfidence < 0.75) {
      assert.equal(routing.routeKind, "operator_review");
    } else {
      assert.equal(routing.routeKind, "builder");
    }
  });

  it("routes security audit intents to audit-lite surface", () => {
    const record = sampleCapture({
      category: "security_audit",
      intent: "Cloudflare security audit for compliance exposure",
    });
    const input = { record };
    const classification = classifyIntentType(input);
    const { totalScore, priority } = scoreIntentQualification(input, classification);
    const routing = routeQualifiedIntent(input, classification, totalScore, priority);
    assert.match(routing.recommendedRoute, /cloudflare-security-audit-lite/);
  });
});

describe("advisory proposals", () => {
  it("generates advisory proposal patterns for qualified intents", () => {
    const qualified = qualifyCapturedIntent(
      sampleCapture({
        intent:
          "Urgent enterprise AI agent for SOC2 compliance workflow across departments — budget approved this week",
        interactionDepth: { dwellMs: 120_000, scrollDepth: 0.9, clicks: 8 },
      }),
    );
    const rollup = emptyQualificationRollup();
    rollup.bySource.direct = 3;
    const proposals = buildAdvisoryProposals(qualified, rollup);
    assert.ok(proposals.length >= 2);
    assert.ok(proposals.every((proposal) => proposal.advisory === true));
    assert.ok(proposals.every((proposal) => proposal.governance.advisoryOnly === true));
    assert.ok(proposals.some((proposal) => proposal.type.startsWith("route_more_traffic_to::")));
    assert.ok(proposals.some((proposal) => proposal.type.startsWith("promote_offer::")));
  });
});

describe("intent qualification reporting", () => {
  it("builds operator report with type and priority counts", () => {
    const qualified = qualifyCapturedIntent(sampleCapture());
    const rollup = emptyQualificationRollup();
    rollup.qualified = 1;
    rollup.byType.ai_agent_build = 1;
    rollup.byPriority.medium = 1;
    rollup.bySource.direct = 1;
    rollup.byRoute["/apps/ai-agent-builder"] = 1;
    rollup.byOffer.ai_agent_builder_intake = 1;

    const report = buildIntentQualificationReport(rollup, [qualified], [], 0);
    assert.equal(report.qualifiedTotal, 1);
    assert.equal(report.countsByType.ai_agent_build, 1);
    assert.equal(report.countsByPriority.medium, 1);
    assert.equal(report.topQualifiedIntents[0]?.captureId, qualified.captureId);
  });

  it("formats INTENT_QUALIFICATION_REPORT markdown", () => {
    const qualified = qualifyCapturedIntent(sampleCapture());
    const rollup = emptyQualificationRollup();
    rollup.qualified = 1;
    rollup.byType.ai_agent_build = 1;
    rollup.byPriority.high = 1;
    rollup.byPriority.high = 1;
    const report = buildIntentQualificationReport(
      rollup,
      [qualified],
      buildAdvisoryProposals(qualified, rollup),
      0,
    );
    const formatted = formatIntentQualificationReport(report);
    assert.match(formatted, /# INTENT_QUALIFICATION_REPORT/);
    assert.match(formatted, /## classification\nworking/);
    assert.match(formatted, /## final state\n/);
  });

  it("resolves system state from rollup depth", () => {
    const rollup = emptyQualificationRollup();
    rollup.qualified = 6;
    rollup.byPriority = { high: 2, medium: 3, low: 1 };
    const report = buildIntentQualificationReport(rollup, [], [], 0);
    assert.equal(report.systemState, "QUALIFIED_PIPELINE");
  });
});

describe("qualifyCapturedIntent end-to-end", () => {
  it("returns full qualification record for a capture", () => {
    const qualified = qualifyCapturedIntent(sampleCapture());
    assert.equal(qualified.captureId, "intent-1000-abc12345");
    assert.equal(qualified.sourceRoute, "/enter");
    assert.ok(qualified.totalScore > 0);
    assert.ok(qualified.routing.recommendedRoute.length > 0);
    assert.equal(qualified.intentSummary.length <= 80, true);
    assert.equal(qualified.governance.mutationAuthorized, false);
  });

  it("handles marketplace module category", () => {
    const qualified = qualifyCapturedIntent(
      sampleCapture({ category: "marketplace_module", intent: "Find a marketplace module for TTX training" }),
    );
    assert.equal(qualified.classification.intentType, "marketplace_module");
    assert.equal(qualified.routing.routeKind, "marketplace");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildIntentCaptureReport,
  buildIntentHandoff,
  evaluateIntentCaptureTrigger,
  formatIntentCaptureReport,
  generateIntentPreview,
} from "../worker/intentCapture.ts";
import { emptyIntentRollup } from "../worker/intentCaptureTypes.ts";

describe("evaluateIntentCaptureTrigger", () => {
  it("does not trigger immediately on page load", () => {
    assert.equal(
      evaluateIntentCaptureTrigger({
        dwellMs: 1000,
        scrollDepth: 0,
        clicks: 0,
        frictionOnPage: false,
        weakExperimentIntent: false,
        pageLoadedAt: Date.now(),
      }),
      false,
    );
  });

  it("triggers after sufficient dwell", () => {
    assert.equal(
      evaluateIntentCaptureTrigger({
        dwellMs: 30_000,
        scrollDepth: 0,
        clicks: 0,
        frictionOnPage: false,
        weakExperimentIntent: false,
        pageLoadedAt: Date.now() - 30_000,
      }),
      true,
    );
  });

  it("triggers on click depth", () => {
    assert.equal(
      evaluateIntentCaptureTrigger({
        dwellMs: 5_000,
        scrollDepth: 0,
        clicks: 2,
        frictionOnPage: false,
        weakExperimentIntent: false,
        pageLoadedAt: Date.now() - 5_000,
      }),
      true,
    );
  });
});

describe("generateIntentPreview", () => {
  it("routes automation intents to automation builder", () => {
    const preview = generateIntentPreview("automate my onboarding workflow", "automation", "intent-1", "/enter");
    assert.match(preview.builderRoute, /automation-builder/);
    assert.match(preview.suggestedSystemType, /automation/i);
  });

  it("routes agent intents to ai agent builder", () => {
    const preview = generateIntentPreview("build a sales agent", "ai_agent", "intent-2", "/");
    assert.match(preview.builderRoute, /ai-agent-builder/);
  });
});

describe("intent capture reporting", () => {
  it("computes intent rate from engaged sessions", () => {
    const rollup = emptyIntentRollup();
    rollup.captures = 4;
    rollup.previews = 3;
    rollup.handoffs = 1;
    const report = buildIntentCaptureReport(rollup, [], { engagedSessions: 10 });
    assert.equal(report.intentRate, 0.4);
    assert.equal(report.previewGenerationRate, 0.75);
    assert.equal(report.handoffRate, 0.333);
  });

  it("formats INTENT_CAPTURE_REPORT", () => {
    const rollup = emptyIntentRollup();
    rollup.captures = 4;
    rollup.previews = 3;
    rollup.handoffs = 1;
    const report = buildIntentCaptureReport(rollup, []);
    const formatted = formatIntentCaptureReport(report, {
      triggerWorking: true,
      captureUiLive: true,
      apiWorking: true,
      builderConnected: true,
      handoffActive: true,
    });
    assert.match(formatted, /# INTENT_CAPTURE_REPORT/);
    assert.match(formatted, /## trigger logic\nworking/);
    assert.match(formatted, /## capture UI\nlive/);
    assert.equal(report.systemState, "CAPTURING_DEMAND");
  });

  it("builds commercial handoff links", () => {
    const preview = generateIntentPreview("build an intake agent", "ai_agent", "intent-3", "/");
    const handoff = buildIntentHandoff(preview, "intent-3", "ai_agent");
    assert.match(handoff.unlockBlueprint, /ai-agent-builder/);
    assert.match(handoff.bookImplementation, /\/enter\?/);
    assert.match(handoff.exploreMarketplaceModule, /\/marketplace/);
  });
});

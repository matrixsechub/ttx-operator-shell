import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyAdaptationFeedback } from "../worker/adaptation.ts";
import {
  assignExperimentalUiMode,
  buildExperimentationSnapshot,
  detectWinningMode,
  formatExperimentationReport,
  hasMinimumExperimentSamples,
} from "../worker/experimentation.ts";

function performance(views: number, marketplaceRate: number) {
  return {
    views,
    entryRate: 0.2,
    marketplaceRate,
    dropOffRate: 0.8,
  };
}

describe("experimentation engine", () => {
  it("stays in EXPERIMENTING until each mode has 20 views", () => {
    const adaptation = emptyAdaptationFeedback();
    adaptation.modes.CONFUSION.views = 25;
    adaptation.modes.FRICTION.views = 10;

    const snapshot = buildExperimentationSnapshot(adaptation, "CONFUSION", "2026-07-10T00:00:00.000Z");
    assert.equal(snapshot.systemState, "EXPERIMENTING");
    assert.equal(snapshot.confidenceLevel, "LOW");
    assert.equal(snapshot.winningMode, null);
  });

  it("selects winner by marketplace rate after minimum sample", () => {
    const adaptation = emptyAdaptationFeedback();
    adaptation.modes = {
      CONFUSION: { views: 25, entryRate: 0.2, marketplaceRate: 0.2, dropOffRate: 0.8 },
      FRICTION: { views: 25, entryRate: 0.3, marketplaceRate: 0.5, dropOffRate: 0.7 },
      ENGAGED: {
        views: 25,
        entryRate: 0.4,
        marketplaceRate: 0.35,
        dropOffRate: 0.6,
        conversionSignal: 0.375,
      },
      DEFAULT: { views: 0, entryRate: 0, marketplaceRate: 0, dropOffRate: 0 },
    };

    const snapshot = buildExperimentationSnapshot(adaptation, "CONFUSION", "2026-07-10T00:00:00.000Z");
    assert.equal(snapshot.systemState, "OPTIMIZING");
    assert.equal(snapshot.winningMode, "FRICTION");
    assert.equal(snapshot.worstMode, "CONFUSION");
    assert.equal(snapshot.governanceProposals[0]?.type, "promote_ui_mode::FRICTION");
    assert.equal(snapshot.governanceProposals[1]?.type, "deprecate_ui_mode::CONFUSION");
  });

  it("biases assignment toward winning mode while preserving exploration", () => {
    const adaptation = emptyAdaptationFeedback();
    for (const mode of ["CONFUSION", "FRICTION", "ENGAGED"] as const) {
      adaptation.modes[mode].views = 30;
      adaptation.modes[mode].marketplaceRate = mode === "ENGAGED" ? 0.6 : 0.1;
    }

    const snapshot = buildExperimentationSnapshot(adaptation, "CONFUSION", "2026-07-10T00:00:00.000Z");
    const assignments = Array.from({ length: 100 }, (_, index) =>
      assignExperimentalUiMode(`00000000-0000-4000-8000-${String(index).padStart(12, "0")}`, "CONFUSION", snapshot),
    );

    const engagedCount = assignments.filter((assignment) => assignment.assignedMode === "ENGAGED").length;
    assert.ok(engagedCount >= 40, `expected biased ENGAGED exposure, got ${engagedCount}`);
    assert.ok(assignments.some((assignment) => assignment.assignedMode === "CONFUSION"));
    assert.ok(assignments.some((assignment) => assignment.assignedMode === "FRICTION"));
  });

  it("uses 70/30 behavior vs explore assignment during experimentation", () => {
    const snapshot = buildExperimentationSnapshot(emptyAdaptationFeedback(), "FRICTION", "2026-07-10T00:00:00.000Z");
    const assignments = Array.from({ length: 100 }, (_, index) =>
      assignExperimentalUiMode(`11111111-1111-4111-8111-${String(index).padStart(12, "0")}`, "FRICTION", snapshot),
    );

    const behaviorAssigned = assignments.filter((assignment) => assignment.source === "behavior").length;
    const exploreAssigned = assignments.filter((assignment) => assignment.source === "explore").length;
    assert.ok(behaviorAssigned >= 50);
    assert.ok(exploreAssigned >= 20);
  });

  it("formats experimentation report", () => {
    const performanceByMode = {
      CONFUSION: performance(25, 0.1),
      FRICTION: performance(25, 0.4),
      ENGAGED: performance(25, 0.5),
      DEFAULT: performance(0, 0),
    };
    assert.equal(hasMinimumExperimentSamples(performanceByMode), true);
    assert.equal(detectWinningMode(performanceByMode), "ENGAGED");

    const snapshot = buildExperimentationSnapshot(emptyAdaptationFeedback(), "DEFAULT", "2026-07-10T00:00:00.000Z");
    const report = formatExperimentationReport(snapshot);
    assert.match(report, /# EXPERIMENTATION_REPORT/);
    assert.match(report, /## winning_mode/);
  });
});

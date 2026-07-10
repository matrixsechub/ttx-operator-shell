import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeFlowRollup, buildDropOffPages, buildTopPaths } from "../worker/flowAnalysis.ts";
import { detectFlowFriction } from "../worker/flowFriction.ts";
import { generateFlowRecommendations } from "../worker/flowRecommendations.ts";
import {
  buildFlowIntelligenceReport,
  formatFlowIntelligenceReport,
  resolveFlowConfidence,
  resolveFlowSystemState,
} from "../worker/flowIntelligence.ts";
import { emptyFlowRollup } from "../worker/flowTypes.ts";

function sampleRollup() {
  const rollup = emptyFlowRollup();
  rollup.sessionCount = 12;
  rollup.singlePageSessions = 3;
  rollup.loopSessionCount = 2;
  rollup.entries = { "/": 8, "/enter": 4 };
  rollup.exits = { "/": 5, "/enter": 6 };
  rollup.pageVisits = { "/": 10, "/enter": 8, "/intake": 4 };
  rollup.transitions = {
    "/": { "/enter": 4 },
    "/enter": { "/intake": 2 },
  };
  rollup.dwellSumMs = { "/": 420_000, "/enter": 180_000 };
  rollup.dwellCount = { "/": 10, "/enter": 8 };
  rollup.pageClicks = { "/": 2, "/enter": 12 };
  rollup.ctaImpressions = { "/enter::hero-enter": 30 };
  rollup.ctaClicks = { "/enter::hero-enter": 1 };
  rollup.formStarts = { "/intake": 6 };
  rollup.formSubmits = { "/intake": 1 };
  rollup.pathCounts = {
    "/": 3,
    "/→/enter": 4,
    "/→/enter→/intake": 2,
  };
  return rollup;
}

describe("analyzeFlowRollup", () => {
  it("computes transition rates and dwell averages", () => {
    const analysis = analyzeFlowRollup(sampleRollup());
    assert.equal(analysis.topEntryPages[0]?.page, "/");
    assert.equal(analysis.avgDwellByPage["/"], 42_000);
    assert.ok(analysis.transitionRates.some((entry) => entry.from === "/" && entry.to === "/enter"));
  });

  it("builds ranked top paths", () => {
    const topPaths = buildTopPaths(sampleRollup());
    assert.ok(topPaths[0]?.path.includes("/enter"));
    assert.ok((topPaths[0]?.share ?? 0) > 0);
  });

  it("builds drop-off pages by exit rate", () => {
    const dropOff = buildDropOffPages(sampleRollup());
    assert.ok(dropOff.length > 0);
    assert.ok(dropOff[0]!.exitRate >= 0);
  });
});

describe("detectFlowFriction", () => {
  it("flags high-exit and form-abandon friction", () => {
    const rollup = sampleRollup();
    const analysis = analyzeFlowRollup(rollup);
    const friction = detectFlowFriction(rollup, analysis);
    assert.ok(friction.some((point) => point.ruleId === "high_exit_trap"));
    assert.ok(friction.some((point) => point.ruleId === "form_abandon"));
  });

  it("returns empty friction below sample threshold", () => {
    const rollup = emptyFlowRollup();
    rollup.sessionCount = 2;
    const friction = detectFlowFriction(rollup, analyzeFlowRollup(rollup));
    assert.equal(friction.length, 0);
  });
});

describe("generateFlowRecommendations", () => {
  it("maps friction points to ranked recommendations", () => {
    const rollup = sampleRollup();
    const friction = detectFlowFriction(rollup, analyzeFlowRollup(rollup));
    const recommendations = generateFlowRecommendations(friction);
    assert.ok(recommendations.length > 0);
    assert.ok(recommendations[0]!.impactScore >= recommendations.at(-1)!.impactScore);
  });
});

describe("buildFlowIntelligenceReport", () => {
  it("assembles report sections and confidence", () => {
    const report = buildFlowIntelligenceReport(sampleRollup(), null);
    assert.ok(report.topPaths.length > 0);
    assert.equal(resolveFlowConfidence(sampleRollup().sessionCount), "medium");
    assert.equal(resolveFlowSystemState(sampleRollup().sessionCount, report.frictionPoints.length, "medium"), "OPTIMIZING");
    const formatted = formatFlowIntelligenceReport(report, true);
    assert.match(formatted, /# FLOW_INTELLIGENCE_REPORT/);
    assert.match(formatted, /## tracking\nactive/);
    assert.match(formatted, /## cockpit visibility\nvisible/);
  });

  it("starts in OBSERVING with low sample size", () => {
    const rollup = emptyFlowRollup();
    rollup.sessionCount = 1;
    const report = buildFlowIntelligenceReport(rollup, null);
    assert.equal(report.systemState, "OBSERVING");
    assert.equal(report.confidence, "low");
  });
});

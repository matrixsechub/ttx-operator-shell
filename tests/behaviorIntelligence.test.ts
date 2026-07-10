import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyzeBehaviorIntelligence,
  classifyUserBehavior,
  computeBehaviorMetrics,
  generateBehaviorGovernanceProposals,
  resolveBehaviorSystemState,
} from "../worker/behaviorIntelligence.ts";

describe("computeBehaviorMetrics", () => {
  it("derives rates from usage counters", () => {
    const metrics = computeBehaviorMetrics({ visits: 10, entryClicks: 2, marketplaceClicks: 4 });
    assert.equal(metrics.entryRate, 0.2);
    assert.equal(metrics.marketplaceRate, 0.4);
    assert.equal(metrics.dropOffRate, 0.8);
  });

  it("returns zeros when visits are zero", () => {
    const metrics = computeBehaviorMetrics({ visits: 0, entryClicks: 0, marketplaceClicks: 0 });
    assert.deepEqual(metrics, { entryRate: 0, marketplaceRate: 0, dropOffRate: 0 });
  });
});

describe("classifyUserBehavior", () => {
  it("classifies confusion at entry", () => {
    assert.equal(
      classifyUserBehavior({ entryRate: 0.2, marketplaceRate: 0.1, dropOffRate: 0.8 }),
      "CONFUSION_AT_ENTRY",
    );
  });

  it("classifies interest without commit", () => {
    assert.equal(
      classifyUserBehavior({ entryRate: 0.5, marketplaceRate: 0.1, dropOffRate: 0.5 }),
      "INTEREST_NO_COMMIT",
    );
  });

  it("classifies active exploration when marketplace rate is high", () => {
    assert.equal(
      classifyUserBehavior({ entryRate: 0.1, marketplaceRate: 0.4, dropOffRate: 0.9 }),
      "ACTIVE_EXPLORATION",
    );
  });
});

describe("analyzeBehaviorIntelligence", () => {
  it("emits governance proposals for learning-active traffic", () => {
    const intelligence = analyzeBehaviorIntelligence(
      {
        visits: 10,
        entryClicks: 6,
        marketplaceClicks: 4,
        environment: "production",
        updatedAt: new Date().toISOString(),
        signalIntegrity: "VALID",
      },
    );

    assert.equal(intelligence.systemState, "LEARNING_ACTIVE");
    assert.equal(intelligence.behaviorClass, "ACTIVE_EXPLORATION");
    assert.equal(intelligence.governanceProposals[0]?.id, "increase_capture_points");
  });

  it("returns signal weak without behavior class for low sample size", () => {
    const intelligence = analyzeBehaviorIntelligence({
      visits: 2,
      entryClicks: 1,
      marketplaceClicks: 0,
      environment: "production",
      updatedAt: new Date().toISOString(),
      signalIntegrity: "VALID",
    });

    assert.equal(intelligence.systemState, "SIGNAL_WEAK");
    assert.equal(intelligence.behaviorClass, null);
    assert.equal(intelligence.governanceProposals.length, 0);
  });

  it("maps confusion to improve_entry_clarity proposal", () => {
    const proposals = generateBehaviorGovernanceProposals("CONFUSION_AT_ENTRY");
    assert.equal(proposals[0]?.id, "improve_entry_clarity");
    assert.equal(resolveBehaviorSystemState({ visits: 0, entryClicks: 0, marketplaceClicks: 0, signalIntegrity: "VALID" }), "NOISE");
  });

  it("blocks classification when signal integrity is invalid", () => {
    const intelligence = analyzeBehaviorIntelligence({
      visits: 2,
      entryClicks: 5,
      marketplaceClicks: 1,
      environment: "production",
      updatedAt: new Date().toISOString(),
      signalIntegrity: "INVALID_RATIOS",
    });

    assert.equal(intelligence.systemState, "SIGNAL_INVALID");
    assert.equal(intelligence.behaviorClass, null);
    assert.equal(intelligence.governanceProposals.length, 0);
  });
});

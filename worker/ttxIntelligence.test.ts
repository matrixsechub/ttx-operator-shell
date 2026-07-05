import { describe, expect, it } from "vitest";
import { computeTrend, rankDecisionTypes, type DecisionType } from "./ttxIntelligence";

describe("rankDecisionTypes", () => {
  it("returns null for both when nothing occurred", () => {
    const totals: Record<DecisionType, number> = { mitigating: 0, "risk-escalating": 0, delay: 0 };
    expect(rankDecisionTypes(totals)).toEqual({ strongest: null, weakest: null });
  });

  it("ranks by impact (count * weight), not by raw occurrence count", () => {
    // mitigating: 5*10=50, risk-escalating: 2*-10=-20, delay: 3*-5=-15
    const totals: Record<DecisionType, number> = { mitigating: 5, "risk-escalating": 2, delay: 3 };
    expect(rankDecisionTypes(totals)).toEqual({ strongest: "mitigating", weakest: "risk-escalating" });
  });

  it("treats the sole occurring type as both strongest and weakest", () => {
    const totals: Record<DecisionType, number> = { mitigating: 0, "risk-escalating": 0, delay: 4 };
    expect(rankDecisionTypes(totals)).toEqual({ strongest: "delay", weakest: "delay" });
  });

  it("breaks impact ties by DECISION_WEIGHTS key order (stable sort)", () => {
    // risk-escalating: 1*-10=-10, delay: 2*-5=-10 — tied impact.
    // Object.keys order is mitigating, risk-escalating, delay, so
    // risk-escalating sorts first among the tied pair.
    const totals: Record<DecisionType, number> = { mitigating: 0, "risk-escalating": 1, delay: 2 };
    expect(rankDecisionTypes(totals)).toEqual({ strongest: "risk-escalating", weakest: "delay" });
  });
});

describe("computeTrend", () => {
  it("is stable with fewer than two data points", () => {
    expect(computeTrend([])).toBe("stable");
    expect(computeTrend([75])).toBe("stable");
  });

  it("improves when the recent half averages more than the threshold above the earlier half", () => {
    expect(computeTrend([50, 50, 56, 56])).toBe("improving"); // delta = 6
  });

  it("declines when the recent half averages more than the threshold below the earlier half", () => {
    expect(computeTrend([56, 56, 50, 50])).toBe("declining"); // delta = -6
  });

  it("is stable when the delta sits at the threshold boundary (exclusive)", () => {
    expect(computeTrend([50, 50, 55, 55])).toBe("stable"); // delta = 5, not > 5
  });

  it("is stable for a flat series", () => {
    expect(computeTrend([60, 60, 60, 60])).toBe("stable");
  });
});

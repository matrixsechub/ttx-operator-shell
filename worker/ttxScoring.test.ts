import { describe, expect, it } from "vitest";
import { computeScore } from "./ttxScoring";
import type { ScenarioDefinition, ScenarioScoringMetadata } from "./scenarioManifest";

function makeScenario(scoring?: ScenarioScoringMetadata): ScenarioDefinition {
  return {
    id: "test-scenario",
    title: "Test Scenario",
    roles: [],
    entry: "start",
    nodes: { start: { id: "start", title: "Start", inject: "", transitions: [] } },
    scoring,
  };
}

describe("computeScore", () => {
  it("buckets risk, delay, and mitigating choices and mixes in the recommended-action bonus/penalty", () => {
    const scenario = makeScenario({
      riskActions: ["riskyChoice"],
      delayActions: ["delayChoice"],
      recommendedActions: ["good1", "good2", "missedRec"],
    });
    const transitions = [
      { choice: "riskyChoice" },
      { choice: "delayChoice" },
      { choice: "good1" },
      { choice: "good2" },
    ];

    const result = computeScore(transitions, scenario);

    // 50 - 10 (risk) - 5 (delay) + 10 + 10 (two mitigating) = 55
    // + 5*2 (two recommended taken) - 5*1 (one recommended missed) = 60
    expect(result.score).toBe(60);
    expect(result.breakdown).toEqual({
      correctChoices: 2,
      riskEscalations: 1,
      mitigations: 2,
      delays: 1,
    });
    expect(result.roleActions).toEqual({
      recommendedTaken: ["good1", "good2"],
      recommendedMissed: ["missedRec"],
    });
  });

  it("clamps the score at 0 when risk escalations dominate", () => {
    const scenario = makeScenario({ riskActions: ["bad"] });
    const transitions = Array.from({ length: 10 }, () => ({ choice: "bad" }));

    const result = computeScore(transitions, scenario);

    expect(result.score).toBe(0); // 50 - 10*10 = -50, clamped to 0
    expect(result.breakdown.riskEscalations).toBe(10);
  });

  it("clamps the score at 100 when mitigating choices dominate", () => {
    const scenario = makeScenario({});
    const transitions = Array.from({ length: 10 }, () => ({ choice: "good" }));

    const result = computeScore(transitions, scenario);

    expect(result.score).toBe(100); // 50 + 10*10 = 150, clamped to 100
    expect(result.breakdown.mitigations).toBe(10);
  });

  it("defaults every choice to mitigating when the scenario has no scoring metadata", () => {
    const scenario = makeScenario(undefined);
    const transitions = [{ choice: "anything" }, { choice: "else" }];

    const result = computeScore(transitions, scenario);

    expect(result.score).toBe(70); // 50 + 10 + 10
    expect(result.breakdown).toEqual({
      correctChoices: 2,
      riskEscalations: 0,
      mitigations: 2,
      delays: 0,
    });
  });

  it("returns the neutral midpoint for a session with no transitions", () => {
    const scenario = makeScenario(undefined);

    const result = computeScore([], scenario);

    expect(result.score).toBe(50);
    expect(result.breakdown).toEqual({ correctChoices: 0, riskEscalations: 0, mitigations: 0, delays: 0 });
    expect(result.roleActions).toEqual({ recommendedTaken: [], recommendedMissed: [] });
  });

  it("dedupes repeated choices for the recommended-action check but not for the breakdown counts", () => {
    const scenario = makeScenario({ recommendedActions: ["good"] });
    const transitions = [{ choice: "good" }, { choice: "good" }];

    const result = computeScore(transitions, scenario);

    expect(result.breakdown.mitigations).toBe(2); // counted per transition
    expect(result.roleActions.recommendedTaken).toEqual(["good"]); // counted once
    expect(result.roleActions.recommendedMissed).toEqual([]);
  });
});

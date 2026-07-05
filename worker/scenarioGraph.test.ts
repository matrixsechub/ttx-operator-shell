import { describe, expect, it } from "vitest";
import { step, validateScenarioGraph } from "./scenarioGraph";
import type { ScenarioDefinition, ScenarioNode } from "./scenarioManifest";

function makeScenario(nodes: Record<string, ScenarioNode>, entry: string): ScenarioDefinition {
  return { id: "test-scenario", title: "Test Scenario", roles: [], entry, nodes };
}

describe("step", () => {
  it("auto-advances a single-transition node regardless of the choice argument", () => {
    const scenario = makeScenario(
      {
        a: { id: "a", title: "A", inject: "", transitions: [{ choice: "default", label: "Continue", next: "b" }] },
        b: { id: "b", title: "B", inject: "", transitions: [] },
      },
      "a",
    );

    const result = step(scenario, "a");
    expect(result).toEqual({ status: "moved", node: scenario.nodes.b });
  });

  it("follows a matching choice when a node branches", () => {
    const scenario = makeScenario(
      {
        a: {
          id: "a",
          title: "A",
          inject: "",
          transitions: [
            { choice: "left", label: "Go left", next: "b" },
            { choice: "right", label: "Go right", next: "c" },
          ],
        },
        b: { id: "b", title: "B", inject: "", transitions: [] },
        c: { id: "c", title: "C", inject: "", transitions: [] },
      },
      "a",
    );

    expect(step(scenario, "a", "right")).toEqual({ status: "moved", node: scenario.nodes.c });
  });

  it("errors when a branching node is given an unmatched choice", () => {
    const scenario = makeScenario(
      {
        a: {
          id: "a",
          title: "A",
          inject: "",
          transitions: [
            { choice: "left", label: "Go left", next: "b" },
            { choice: "right", label: "Go right", next: "c" },
          ],
        },
        b: { id: "b", title: "B", inject: "", transitions: [] },
        c: { id: "c", title: "C", inject: "", transitions: [] },
      },
      "a",
    );

    const result = step(scenario, "a", "sideways");
    expect(result.status).toBe("error");
    expect((result as { status: "error"; message: string }).message).toContain("left, right");
  });

  it("errors when a branching node is given no choice at all", () => {
    const scenario = makeScenario(
      {
        a: {
          id: "a",
          title: "A",
          inject: "",
          transitions: [
            { choice: "left", label: "Go left", next: "b" },
            { choice: "right", label: "Go right", next: "c" },
          ],
        },
        b: { id: "b", title: "B", inject: "", transitions: [] },
        c: { id: "c", title: "C", inject: "", transitions: [] },
      },
      "a",
    );

    expect(step(scenario, "a").status).toBe("error");
  });

  it("reports done for a terminal node", () => {
    const scenario = makeScenario({ a: { id: "a", title: "A", inject: "", transitions: [] } }, "a");
    expect(step(scenario, "a")).toEqual({ status: "done" });
  });

  it("errors for an unknown current node", () => {
    const scenario = makeScenario({ a: { id: "a", title: "A", inject: "", transitions: [] } }, "a");
    const result = step(scenario, "ghost");
    expect(result).toEqual({ status: "error", message: "Unknown current node" });
  });

  it("errors when a transition points at a node that doesn't exist", () => {
    const scenario = makeScenario(
      { a: { id: "a", title: "A", inject: "", transitions: [{ choice: "default", label: "Continue", next: "ghost" }] } },
      "a",
    );
    const result = step(scenario, "a");
    expect(result).toEqual({ status: "error", message: "Transition target not found" });
  });
});

describe("validateScenarioGraph", () => {
  it("accepts a well-formed graph", () => {
    const scenario = makeScenario(
      {
        a: { id: "a", title: "A", inject: "", transitions: [{ choice: "default", label: "Continue", next: "b" }] },
        b: { id: "b", title: "B", inject: "", transitions: [] },
      },
      "a",
    );
    expect(validateScenarioGraph(scenario)).toEqual({ ok: true });
  });

  it("rejects a missing entry node", () => {
    const scenario = makeScenario({ a: { id: "a", title: "A", inject: "", transitions: [] } }, "ghost");
    const result = validateScenarioGraph(scenario);
    expect(result).toEqual({ ok: false, error: 'Entry node "ghost" does not exist' });
  });

  it("rejects a dangling transition", () => {
    const scenario = makeScenario(
      { a: { id: "a", title: "A", inject: "", transitions: [{ choice: "default", label: "Continue", next: "ghost" }] } },
      "a",
    );
    const result = validateScenarioGraph(scenario);
    expect(result).toEqual({ ok: false, error: 'Node "a" has a transition to unknown node "ghost"' });
  });

  it("rejects a graph with no terminal node", () => {
    const scenario = makeScenario(
      {
        a: { id: "a", title: "A", inject: "", transitions: [{ choice: "default", label: "Continue", next: "b" }] },
        b: { id: "b", title: "B", inject: "", transitions: [{ choice: "default", label: "Continue", next: "a" }] },
      },
      "a",
    );
    const result = validateScenarioGraph(scenario);
    expect(result).toEqual({ ok: false, error: "Scenario has no terminal node — it would never end" });
  });

  // Documents current behavior, not a fix: validateScenarioGraph checks that
  // *some* node in the record is terminal, not that a terminal node is
  // reachable from `entry`. A graph whose only reachable path is an
  // infinite loop still passes if an unreachable node elsewhere has no
  // outgoing transitions.
  it("accepts a graph whose only terminal node is unreachable from entry", () => {
    const scenario = makeScenario(
      {
        entry: { id: "entry", title: "Entry", inject: "", transitions: [{ choice: "default", label: "Continue", next: "loop" }] },
        loop: { id: "loop", title: "Loop", inject: "", transitions: [{ choice: "default", label: "Continue", next: "loop" }] },
        orphan: { id: "orphan", title: "Orphan", inject: "", transitions: [] },
      },
      "entry",
    );
    expect(validateScenarioGraph(scenario)).toEqual({ ok: true });
  });
});

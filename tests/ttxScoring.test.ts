import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeScore, handleScoringRoute, listScorePackets } from "../worker/ttxScoring.ts";
import type { ScoringEnv } from "../worker/ttxScoring.ts";
import { recordAnalyticsFinalize, recordAnalyticsStart } from "../worker/ttxAnalytics.ts";
import { SCENARIO_DEFINITIONS } from "../worker/scenarioManifest.ts";
import type { ScenarioDefinition } from "../worker/scenarioManifest.ts";

// A list-capable mock KV. tests/ttxSession.test.ts's mock hardcodes list()
// to return no keys, which is fine for the session happy path but makes
// every list-derived feature (scores, history, intelligence) untestable.
// list() sorts keys lexicographically on purpose: that is what Workers KV
// actually does, and treating that order as chronological is exactly the
// defect this suite guards against.
function createMockKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
    async list(options?: { prefix?: string; limit?: number }) {
      const prefix = options?.prefix ?? "";
      const limit = options?.limit ?? 1000;
      const keys = [...store.keys()]
        .filter((key) => key.startsWith(prefix))
        .sort()
        .slice(0, limit)
        .map((name) => ({ name }));
      return { keys, list_complete: true, cacheStatus: null };
    },
    async getWithMetadata() {
      return null;
    },
  } as unknown as KVNamespace;
}

function scenarioWith(scoring: ScenarioDefinition["scoring"]): ScenarioDefinition {
  return {
    id: "test-01",
    title: "Test Scenario",
    roles: [],
    entry: "start",
    nodes: { start: { id: "start", title: "Start", body: "", transitions: [] } },
    scoring,
  } as ScenarioDefinition;
}

// Seeds a score packet directly, so key order and computedAt can be set
// independently of each other.
async function seedScore(kv: KVNamespace, key: string, computedAt: string, score = 50): Promise<void> {
  await kv.put(
    `score:${key}`,
    JSON.stringify({
      sessionId: key,
      scenarioId: "baseline-01",
      score,
      breakdown: { correctChoices: 0, riskEscalations: 0, mitigations: 0, delays: 0 },
      roleActions: { recommendedTaken: [], recommendedMissed: [] },
      computedAt,
    }),
  );
}

const MINUTE_MS = 60_000;
const EPOCH = Date.parse("2026-01-01T00:00:00.000Z");

// Two deliberately opposed key schemes. Real score keys are
// score:<crypto.randomUUID()>, so lexicographic order is unrelated to age;
// these make that independence explicit and, crucially, make each test
// discriminating. A single scheme would let one of the two defects pass
// unnoticed, because whichever order it happens to encode is the order the
// unfixed code produces by accident.

// Ascending: lexicographic order runs oldest -> newest. Unfixed
// listScorePackets returns this raw, i.e. oldest-first and, past the cap,
// the oldest 100 rather than the newest.
function keyOldestSortsFirst(index: number): string {
  return `${String(index).padStart(4, "0")}-session`;
}

// Descending: lexicographic order runs newest -> oldest. Unfixed retention
// deletes the lexicographically-first keys, i.e. exactly the newest ones.
function keyNewestSortsFirst(index: number, total: number): string {
  return `${String(total - index).padStart(4, "0")}-session`;
}

function computedAtForIndex(index: number): string {
  return new Date(EPOCH + index * MINUTE_MS).toISOString();
}

describe("computeScore", () => {
  it("starts from the neutral midpoint when there are no transitions", () => {
    const result = computeScore([], scenarioWith(undefined));
    assert.equal(result.score, 50);
    assert.deepEqual(result.breakdown, { correctChoices: 0, riskEscalations: 0, mitigations: 0, delays: 0 });
  });

  it("treats an unclassified choice as mitigating (+10)", () => {
    const result = computeScore([{ choice: "contain" }], scenarioWith(undefined));
    assert.equal(result.score, 60);
    assert.equal(result.breakdown.mitigations, 1);
    // correctChoices and mitigations are the same count by design.
    assert.equal(result.breakdown.correctChoices, 1);
  });

  it("subtracts 10 for a risk-escalating choice and 5 for a delay", () => {
    const scenario = scenarioWith({ riskActions: ["ignore"], delayActions: ["wait"] });

    assert.equal(computeScore([{ choice: "ignore" }], scenario).score, 40);
    assert.equal(computeScore([{ choice: "wait" }], scenario).score, 45);

    const mixed = computeScore([{ choice: "ignore" }, { choice: "wait" }, { choice: "contain" }], scenario);
    assert.equal(mixed.score, 45); // 50 - 10 - 5 + 10
    assert.deepEqual(mixed.breakdown, { correctChoices: 1, riskEscalations: 1, mitigations: 1, delays: 1 });
  });

  it("classifies a choice as risk-escalating when it is listed as both risk and delay", () => {
    // riskActions is checked first, so the overlap resolves to -10, not -5.
    const scenario = scenarioWith({ riskActions: ["both"], delayActions: ["both"] });
    const result = computeScore([{ choice: "both" }], scenario);
    assert.equal(result.score, 40);
    assert.equal(result.breakdown.riskEscalations, 1);
    assert.equal(result.breakdown.delays, 0);
  });

  it("adds 5 per recommended action taken and subtracts 5 per one missed", () => {
    const scenario = scenarioWith({ recommendedActions: ["isolate", "notify"] });

    const both = computeScore([{ choice: "isolate" }, { choice: "notify" }], scenario);
    // 50 + 10 + 10 (two mitigating) + 5 + 5 (both recommended taken)
    assert.equal(both.score, 80);
    assert.deepEqual(both.roleActions, { recommendedTaken: ["isolate", "notify"], recommendedMissed: [] });

    const neither = computeScore([], scenario);
    assert.equal(neither.score, 40); // 50 - 5 - 5
    assert.deepEqual(neither.roleActions, { recommendedTaken: [], recommendedMissed: ["isolate", "notify"] });
  });

  it("counts a repeated recommended action once", () => {
    const scenario = scenarioWith({ recommendedActions: ["isolate"] });
    const result = computeScore([{ choice: "isolate" }, { choice: "isolate" }], scenario);
    // Two mitigating transitions (+20) but a single recommended bonus (+5).
    assert.equal(result.score, 75);
    assert.deepEqual(result.roleActions.recommendedTaken, ["isolate"]);
  });

  it("clamps to 0 and 100 rather than running unbounded", () => {
    const risky = scenarioWith({ riskActions: ["bad"] });
    const manyBad = computeScore(
      Array.from({ length: 20 }, () => ({ choice: "bad" })),
      risky,
    );
    assert.equal(manyBad.score, 0);
    assert.equal(manyBad.breakdown.riskEscalations, 20);

    const manyGood = computeScore(
      Array.from({ length: 20 }, (_unused, index) => ({ choice: `good-${index}` })),
      scenarioWith(undefined),
    );
    assert.equal(manyGood.score, 100);
  });
});

describe("listScorePackets ordering", () => {
  it("returns newest-first even when key order runs oldest-first", async () => {
    const kv = createMockKv();
    const total = 5;
    for (let index = 0; index < total; index += 1) {
      await seedScore(kv, keyOldestSortsFirst(index), computedAtForIndex(index));
    }

    const packets = await listScorePackets(kv);

    assert.equal(packets.length, total);
    const timestamps = packets.map((packet) => packet.computedAt);
    assert.deepEqual(timestamps, [...timestamps].sort().reverse());
    assert.equal(packets[0].computedAt, computedAtForIndex(total - 1));
  });

  it("caps at the newest 100, not an arbitrary lexicographic 100", async () => {
    const kv = createMockKv();
    const total = 150;
    for (let index = 0; index < total; index += 1) {
      await seedScore(kv, keyOldestSortsFirst(index), computedAtForIndex(index));
    }

    const packets = await listScorePackets(kv);

    assert.equal(packets.length, 100);
    // The newest record must be present and the oldest must not be.
    assert.equal(packets[0].computedAt, computedAtForIndex(total - 1));
    assert.equal(packets[packets.length - 1].computedAt, computedAtForIndex(total - 100));
    assert.ok(!packets.some((packet) => packet.computedAt === computedAtForIndex(0)));
  });

  it("returns an empty list when nothing has been scored", async () => {
    assert.deepEqual(await listScorePackets(createMockKv()), []);
  });
});

describe("score retention", () => {
  it("deletes the oldest packets, not the lexicographically-first ones", async () => {
    const kv = createMockKv();
    const env: ScoringEnv = { TTX_STATE: kv };
    const seeded = 105;

    for (let index = 0; index < seeded; index += 1) {
      await seedScore(kv, keyNewestSortsFirst(index, seeded), computedAtForIndex(index));
    }

    // Score a real session so the write path (and its retention pass) runs.
    const scenario = SCENARIO_DEFINITIONS["baseline-01"];
    const sessionId = "fresh-session";
    await recordAnalyticsStart(kv, sessionId, scenario, scenario.entry);
    await recordAnalyticsFinalize(kv, sessionId, scenario.entry);

    const response = await handleScoringRoute(
      new Request("https://example.com/api/ttx/sessions/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }),
      "/api/ttx/sessions/score",
      env,
    );
    assert.equal(response?.status, 200);

    const remaining = await listScorePackets(kv);
    assert.equal(remaining.length, 100);

    // The six oldest seeded packets are gone.
    for (let index = 0; index < 6; index += 1) {
      assert.equal(await kv.get(`score:${keyNewestSortsFirst(index, seeded)}`), null);
    }
    // The newest seeded packet survived — under key-order retention it
    // sorts first and would have been the first thing deleted.
    assert.notEqual(await kv.get(`score:${keyNewestSortsFirst(seeded - 1, seeded)}`), null);
    // As did the session just scored.
    assert.notEqual(await kv.get(`score:${sessionId}`), null);
  });

  it("leaves everything in place when the set is under the cap", async () => {
    const kv = createMockKv();
    const env: ScoringEnv = { TTX_STATE: kv };

    for (let index = 0; index < 3; index += 1) {
      await seedScore(kv, keyNewestSortsFirst(index, 3), computedAtForIndex(index));
    }

    const scenario = SCENARIO_DEFINITIONS["baseline-01"];
    await recordAnalyticsStart(kv, "small-session", scenario, scenario.entry);
    await recordAnalyticsFinalize(kv, "small-session", scenario.entry);
    await handleScoringRoute(
      new Request("https://example.com/api/ttx/sessions/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "small-session" }),
      }),
      "/api/ttx/sessions/score",
      env,
    );

    assert.equal((await listScorePackets(kv)).length, 4);
  });
});

describe("scoring route guards", () => {
  it("refuses to score a session that has not reached a terminal node", async () => {
    const kv = createMockKv();
    const env: ScoringEnv = { TTX_STATE: kv };
    const scenario = SCENARIO_DEFINITIONS["baseline-01"];

    await recordAnalyticsStart(kv, "open-session", scenario, scenario.entry);

    const response = await handleScoringRoute(
      new Request("https://example.com/api/ttx/sessions/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "open-session" }),
      }),
      "/api/ttx/sessions/score",
      env,
    );

    assert.equal(response?.status, 400);
  });

  it("404s for a session with no analytics packet", async () => {
    const env: ScoringEnv = { TTX_STATE: createMockKv() };
    const response = await handleScoringRoute(
      new Request("https://example.com/api/ttx/sessions/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "missing" }),
      }),
      "/api/ttx/sessions/score",
      env,
    );

    assert.equal(response?.status, 404);
  });

  it("does not claim unrelated paths", async () => {
    const env: ScoringEnv = { TTX_STATE: createMockKv() };
    const response = await handleScoringRoute(
      new Request("https://example.com/api/ttx/roles"),
      "/api/ttx/roles",
      env,
    );
    assert.equal(response, null);
  });
});

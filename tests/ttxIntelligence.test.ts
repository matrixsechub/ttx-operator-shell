import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bandForScore, handleHistoryRoute } from "../worker/ttxHistory.ts";
import type { HistoryEnv } from "../worker/ttxHistory.ts";
import { handleIntelligenceRoute } from "../worker/ttxIntelligence.ts";
import type { IntelligenceEnv } from "../worker/ttxIntelligence.ts";
import type { ScoreBreakdown } from "../worker/ttxScoring.ts";

// Covers the two derive-on-read layers together, because that is how they
// actually run: intelligence reads through history, which reads through the
// score list. The empty-state contracts asserted here are the ones the
// Phase 37/38 panels branch on.

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

const EPOCH = Date.parse("2026-01-01T00:00:00.000Z");
const MINUTE_MS = 60_000;

interface SeedOptions {
  sessionId: string;
  score: number;
  minute: number;
  scenarioId?: string;
  breakdown?: Partial<ScoreBreakdown>;
}

// Writes the score packet and the analytics packet that history joins
// against. History drops any session missing either one, or missing
// endedAt, so both are required for a row to appear.
async function seedScoredSession(kv: KVNamespace, options: SeedOptions): Promise<void> {
  const { sessionId, score, minute, scenarioId = "baseline-01" } = options;
  const startedAt = new Date(EPOCH + minute * MINUTE_MS).toISOString();
  const endedAt = new Date(EPOCH + (minute + 1) * MINUTE_MS).toISOString();
  const breakdown: ScoreBreakdown = {
    correctChoices: 0,
    riskEscalations: 0,
    mitigations: 0,
    delays: 0,
    ...options.breakdown,
  };

  await kv.put(
    `analytics:${sessionId}`,
    JSON.stringify({
      sessionId,
      scenarioId,
      scenarioSource: "builtin",
      entryNode: "phase1",
      transitions: [],
      terminalNode: "phase1",
      roleTags: [],
      moduleTags: [],
      startedAt,
      endedAt,
      durationMs: MINUTE_MS,
    }),
  );

  await kv.put(
    `score:${sessionId}`,
    JSON.stringify({ sessionId, scenarioId, score, breakdown, roleActions: { recommendedTaken: [], recommendedMissed: [] }, computedAt: endedAt }),
  );
}

async function getHistory(env: HistoryEnv, query = ""): Promise<{ status: number; history: { sessionId: string; scenarioName: string; score: number; band: string }[] }> {
  const response = await handleHistoryRoute(
    new Request(`https://example.com/api/ttx/sessions/history${query}`),
    "/api/ttx/sessions/history",
    env,
  );
  assert.ok(response);
  const body = (await response.json()) as { history: { sessionId: string; scenarioName: string; score: number; band: string }[] };
  return { status: response.status, history: body.history };
}

async function getIntelligence(env: IntelligenceEnv): Promise<Record<string, unknown>> {
  const response = await handleIntelligenceRoute(
    new Request("https://example.com/api/ttx/intelligence"),
    "/api/ttx/intelligence",
    env,
  );
  assert.ok(response);
  assert.equal(response.status, 200);
  return (await response.json()) as Record<string, unknown>;
}

describe("bandForScore", () => {
  it("bands on the 70 and 40 boundaries inclusively", () => {
    assert.equal(bandForScore(100), "strong");
    assert.equal(bandForScore(70), "strong");
    assert.equal(bandForScore(69), "mixed");
    assert.equal(bandForScore(40), "mixed");
    assert.equal(bandForScore(39), "degraded");
    assert.equal(bandForScore(0), "degraded");
  });
});

describe("session history route", () => {
  it("returns an empty list rather than an error when nothing is scored", async () => {
    const env: HistoryEnv = { TTX_STATE: createMockKv() };
    const { status, history } = await getHistory(env);
    assert.equal(status, 200);
    assert.deepEqual(history, []);
  });

  it("returns scored sessions newest-first with a resolved scenario name", async () => {
    const kv = createMockKv();
    const env: HistoryEnv = { TTX_STATE: kv };

    await seedScoredSession(kv, { sessionId: "oldest", score: 30, minute: 0 });
    await seedScoredSession(kv, { sessionId: "newest", score: 90, minute: 100 });
    await seedScoredSession(kv, { sessionId: "middle", score: 55, minute: 50 });

    const { history } = await getHistory(env);

    assert.deepEqual(
      history.map((packet) => packet.sessionId),
      ["newest", "middle", "oldest"],
    );
    assert.deepEqual(
      history.map((packet) => packet.band),
      ["strong", "mixed", "degraded"],
    );
    // baseline-01 is a builtin, so the title resolves rather than falling
    // back to the raw scenario id.
    assert.equal(history[0].scenarioName, "Baseline Scenario");
  });

  it("falls back to the scenario id when the scenario no longer exists", async () => {
    const kv = createMockKv();
    const env: HistoryEnv = { TTX_STATE: kv };
    await seedScoredSession(kv, { sessionId: "orphan", score: 50, minute: 0, scenarioId: "deleted-99" });

    const { history } = await getHistory(env);
    assert.equal(history.length, 1);
    assert.equal(history[0].scenarioName, "deleted-99");
  });

  it("skips a scored session whose run never finished", async () => {
    const kv = createMockKv();
    const env: HistoryEnv = { TTX_STATE: kv };

    await seedScoredSession(kv, { sessionId: "complete", score: 50, minute: 0 });
    // A score with no analytics packet at all cannot be joined.
    await kv.put(
      "score:dangling",
      JSON.stringify({
        sessionId: "dangling",
        scenarioId: "baseline-01",
        score: 80,
        breakdown: { correctChoices: 0, riskEscalations: 0, mitigations: 0, delays: 0 },
        roleActions: { recommendedTaken: [], recommendedMissed: [] },
        computedAt: new Date(EPOCH).toISOString(),
      }),
    );

    const { history } = await getHistory(env);
    assert.deepEqual(
      history.map((packet) => packet.sessionId),
      ["complete"],
    );
  });

  it("filters to one scenario when scenarioId is supplied", async () => {
    const kv = createMockKv();
    const env: HistoryEnv = { TTX_STATE: kv };

    await seedScoredSession(kv, { sessionId: "base", score: 50, minute: 0 });
    await seedScoredSession(kv, { sessionId: "branch", score: 60, minute: 10, scenarioId: "branching-01" });

    const { history } = await getHistory(env, "?scenarioId=branching-01");
    assert.deepEqual(
      history.map((packet) => packet.sessionId),
      ["branch"],
    );
  });

  it("rejects a non-GET request", async () => {
    const env: HistoryEnv = { TTX_STATE: createMockKv() };
    const response = await handleHistoryRoute(
      new Request("https://example.com/api/ttx/sessions/history", { method: "POST" }),
      "/api/ttx/sessions/history",
      env,
    );
    assert.equal(response?.status, 405);
  });
});

describe("intelligence route", () => {
  it("reports null aggregates rather than zeros when nothing is scored", async () => {
    const env: IntelligenceEnv = { TTX_STATE: createMockKv() };
    const packet = await getIntelligence(env);

    assert.equal(packet.sessionsAnalyzed, 0);
    // A zero here would read as a measured score of zero — the Phase 38
    // panel depends on these staying null to render its empty state.
    assert.equal(packet.averageScore, null);
    assert.equal(packet.scoreBand, null);
    assert.equal(packet.strongestDecisionType, null);
    assert.equal(packet.weakestDecisionType, null);
    assert.equal(packet.trend, "stable");
  });

  it("averages and bands across scored sessions", async () => {
    const kv = createMockKv();
    const env: IntelligenceEnv = { TTX_STATE: kv };

    await seedScoredSession(kv, { sessionId: "a", score: 80, minute: 0 });
    await seedScoredSession(kv, { sessionId: "b", score: 60, minute: 10 });

    const packet = await getIntelligence(env);
    assert.equal(packet.sessionsAnalyzed, 2);
    assert.equal(packet.averageScore, 70);
    assert.equal(packet.scoreBand, "strong"); // 70 is the strong boundary
  });

  it("ranks decision types by impact, not by how often they occur", async () => {
    const kv = createMockKv();
    const env: IntelligenceEnv = { TTX_STATE: kv };

    // Risk escalations are the most frequent (3) but each is worth -10, so
    // by impact they are the weakest; the single mitigation (+10) is the
    // strongest. A frequency-based ranking would invert this.
    await seedScoredSession(kv, {
      sessionId: "impact",
      score: 50,
      minute: 0,
      breakdown: { mitigations: 1, riskEscalations: 3, delays: 1 },
    });

    const packet = await getIntelligence(env);
    assert.equal(packet.strongestDecisionType, "mitigating");
    assert.equal(packet.weakestDecisionType, "risk-escalating");
  });

  it("omits decision types that never occurred", async () => {
    const kv = createMockKv();
    const env: IntelligenceEnv = { TTX_STATE: kv };
    await seedScoredSession(kv, { sessionId: "only-delay", score: 45, minute: 0, breakdown: { delays: 2 } });

    const packet = await getIntelligence(env);
    // Only one type occurred, so it is simultaneously strongest and
    // weakest — the Phase 38 panel collapses this case to a single line.
    assert.equal(packet.strongestDecisionType, "delay");
    assert.equal(packet.weakestDecisionType, "delay");
  });

  it("reports an improving trend when the recent half outscores the earlier half", async () => {
    const kv = createMockKv();
    const env: IntelligenceEnv = { TTX_STATE: kv };

    await seedScoredSession(kv, { sessionId: "s1", score: 40, minute: 0 });
    await seedScoredSession(kv, { sessionId: "s2", score: 40, minute: 10 });
    await seedScoredSession(kv, { sessionId: "s3", score: 60, minute: 20 });
    await seedScoredSession(kv, { sessionId: "s4", score: 60, minute: 30 });

    const packet = await getIntelligence(env);
    assert.equal(packet.trend, "improving");
  });

  it("reports a declining trend when the recent half underperforms", async () => {
    const kv = createMockKv();
    const env: IntelligenceEnv = { TTX_STATE: kv };

    await seedScoredSession(kv, { sessionId: "s1", score: 80, minute: 0 });
    await seedScoredSession(kv, { sessionId: "s2", score: 80, minute: 10 });
    await seedScoredSession(kv, { sessionId: "s3", score: 50, minute: 20 });
    await seedScoredSession(kv, { sessionId: "s4", score: 50, minute: 30 });

    const packet = await getIntelligence(env);
    assert.equal(packet.trend, "declining");
  });

  it("treats a swing inside the noise threshold as stable", async () => {
    const kv = createMockKv();
    const env: IntelligenceEnv = { TTX_STATE: kv };

    // A 4-point improvement sits under the 5-point threshold.
    await seedScoredSession(kv, { sessionId: "s1", score: 50, minute: 0 });
    await seedScoredSession(kv, { sessionId: "s2", score: 54, minute: 10 });

    const packet = await getIntelligence(env);
    assert.equal(packet.trend, "stable");
  });

  it("stays stable with a single scored session", async () => {
    const kv = createMockKv();
    const env: IntelligenceEnv = { TTX_STATE: kv };
    await seedScoredSession(kv, { sessionId: "lonely", score: 95, minute: 0 });

    const packet = await getIntelligence(env);
    assert.equal(packet.sessionsAnalyzed, 1);
    assert.equal(packet.trend, "stable");
  });

  it("rejects a non-GET request", async () => {
    const env: IntelligenceEnv = { TTX_STATE: createMockKv() };
    const response = await handleIntelligenceRoute(
      new Request("https://example.com/api/ttx/intelligence", { method: "POST" }),
      "/api/ttx/intelligence",
      env,
    );
    assert.equal(response?.status, 405);
  });
});

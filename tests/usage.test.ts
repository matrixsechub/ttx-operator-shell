import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { buildAdaptationFeedback } from "../worker/adaptation.ts";
import {
  getUsageSummary,
  isValidSessionId,
  recordUsageEvent,
} from "../worker/usage.ts";

function createEnv() {
  const store = new Map<string, string>();
  return {
    SYSTEM_MODE: "PRODUCTION",
    TTX_STATE: {
      async get(key: string) {
        return store.get(key) ?? null;
      },
      async put(key: string, value: string) {
        store.set(key, value);
      },
    } as unknown as KVNamespace,
  };
}

describe("usage tracking", () => {
  it("validates session ids", () => {
    assert.equal(isValidSessionId(randomUUID()), true);
    assert.equal(isValidSessionId("not-a-uuid"), false);
    assert.equal(isValidSessionId(null), false);
  });

  it("counts one event per session", async () => {
    const env = createEnv();
    const sessionId = randomUUID();

    const first = await recordUsageEvent(env, { event: "visit", sessionId });
    const duplicate = await recordUsageEvent(env, { event: "visit", sessionId });

    assert.equal(first.counted, true);
    assert.equal(duplicate.counted, false);
    assert.equal(duplicate.reason, "duplicate");

    const summary = await getUsageSummary(env);
    assert.equal(summary.visits, 1);
    assert.equal(summary.signalIntegrity, "VALID");
    assert.equal(summary.environment, "production");
  });

  it("requires a visit before click events", async () => {
    const env = createEnv();
    const sessionId = randomUUID();

    const entryWithoutVisit = await recordUsageEvent(env, { event: "entry_click", sessionId });
    assert.equal(entryWithoutVisit.counted, false);
    assert.equal(entryWithoutVisit.reason, "no_visit");

    await recordUsageEvent(env, { event: "visit", sessionId });
    const entry = await recordUsageEvent(env, {
      event: "entry_click",
      sessionId,
      uiMode: "FRICTION",
    });
    const marketplace = await recordUsageEvent(env, {
      event: "marketplace_click",
      sessionId,
      uiMode: "FRICTION",
    });

    assert.equal(entry.counted, true);
    assert.equal(marketplace.counted, true);

    const summary = await getUsageSummary(env);
    assert.equal(summary.visits, 1);
    assert.equal(summary.entryClicks, 1);
    assert.equal(summary.marketplaceClicks, 1);
    assert.equal(summary.signalIntegrity, "VALID");
  });

  it("records ui mode views and attributes clicks to mode", async () => {
    const env = createEnv();
    const sessionId = randomUUID();

    await recordUsageEvent(env, { event: "visit", sessionId });
    const modeView = await recordUsageEvent(env, {
      event: "ui_mode_view",
      sessionId,
      uiMode: "CONFUSION",
    });
    assert.equal(modeView.counted, true);

    await recordUsageEvent(env, { event: "entry_click", sessionId, uiMode: "CONFUSION" });

    const adaptation = await buildAdaptationFeedback(env);
    assert.equal(adaptation.modes.CONFUSION.views, 1);
    assert.equal(adaptation.modes.CONFUSION.entryRate, 1);
    assert.equal(adaptation.modes.CONFUSION.dropOffRate, 0);
  });
});

describe("adaptation feedback", () => {
  it("computes per-mode rates from attributed counters", async () => {
    const env = createEnv();
    const confusionSession = randomUUID();
    const frictionSession = randomUUID();

    for (const [sessionId, mode] of [
      [confusionSession, "CONFUSION"],
      [frictionSession, "FRICTION"],
    ] as const) {
      await recordUsageEvent(env, { event: "visit", sessionId });
      await recordUsageEvent(env, { event: "ui_mode_view", sessionId, uiMode: mode });
    }

    await recordUsageEvent(env, {
      event: "marketplace_click",
      sessionId: frictionSession,
      uiMode: "FRICTION",
    });

    const adaptation = await buildAdaptationFeedback(env);

    assert.equal(adaptation.modes.CONFUSION.views, 1);
    assert.equal(adaptation.modes.CONFUSION.entryRate, 0);
    assert.equal(adaptation.modes.FRICTION.marketplaceRate, 1);
    assert.equal(adaptation.modes.ENGAGED.conversionSignal, 0);
  });
});

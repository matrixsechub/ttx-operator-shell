import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getAdaptiveEntryCopy,
  resolveAdaptiveEntryMode,
  resolveAdaptiveEntryUiMode,
} from "../src/lib/adaptiveEntry.ts";

const learning = (entryRate: number, marketplaceRate: number, behaviorClass: string | null) => ({
  metrics: { entryRate, marketplaceRate, dropOffRate: 1 - entryRate },
  behaviorClass,
  systemState: "LEARNING_ACTIVE" as const,
});

describe("resolveAdaptiveEntryMode", () => {
  it("maps low entry rate to confusion", () => {
    assert.equal(resolveAdaptiveEntryMode(learning(0.2, 0.1, "CONFUSION_AT_ENTRY")), "CONFUSION");
  });

  it("maps healthy entry and low marketplace to friction", () => {
    assert.equal(resolveAdaptiveEntryMode(learning(0.5, 0.1, "INTEREST_NO_COMMIT")), "FRICTION");
  });

  it("maps high marketplace rate to engaged", () => {
    assert.equal(resolveAdaptiveEntryMode(learning(0.1, 0.4, "ACTIVE_EXPLORATION")), "ENGAGED");
  });

  it("prefers engaged when marketplace rate crosses threshold", () => {
    assert.equal(resolveAdaptiveEntryMode(learning(0.2, 0.35, "ACTIVE_EXPLORATION")), "ENGAGED");
  });

  it("returns default when signals are still learning", () => {
    assert.equal(
      resolveAdaptiveEntryUiMode({
        metrics: { entryRate: 0, marketplaceRate: 0, dropOffRate: 0 },
        behaviorClass: null,
        systemState: "SIGNAL_WEAK",
      }),
      "DEFAULT",
    );
  });
});

describe("getAdaptiveEntryCopy", () => {
  it("shows a single CTA for confusion", () => {
    const copy = getAdaptiveEntryCopy("CONFUSION");
    assert.equal(copy.primaryCta.label, "Enter System");
    assert.equal(copy.secondaryCta, undefined);
    assert.ok(copy.helper);
  });

  it("highlights marketplace for friction", () => {
    const copy = getAdaptiveEntryCopy("FRICTION");
    assert.equal(copy.primaryCta.label, "Explore Marketplace");
    assert.equal(copy.secondaryCta?.label, "Enter System");
    assert.ok(copy.trustSignal);
  });

  it("shows progression CTAs for engaged users", () => {
    const copy = getAdaptiveEntryCopy("ENGAGED");
    assert.equal(copy.primaryCta.label, "Start Session");
    assert.equal(copy.secondaryCta?.label, "Explore Modules");
    assert.ok(copy.progression);
  });
});

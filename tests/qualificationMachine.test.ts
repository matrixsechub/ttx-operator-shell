import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveStage,
  STAGE_GUARDS,
  type EvidenceItem,
} from "../src/pearl/qualificationMachine.ts";

const T0 = 1_000_000;

function captured(at = T0): EvidenceItem {
  return { kind: "capture_confirmed", at, data: { source: "register", consent: true } };
}
function visit(at = T0 + 10): EvidenceItem {
  return { kind: "surface_visit", at, data: { page: "/onboarding" } };
}
function answer(at = T0 + 20, questionId = "objective"): EvidenceItem {
  return { kind: "answer", at, data: { questionId, answer: "security" } };
}
function routeShown(at = T0 + 30): EvidenceItem {
  return { kind: "route_shown", at, data: { recommendedPath: "cybersecurity", recommendedTier: "operator" } };
}
function decision(at = T0 + 40): EvidenceItem {
  return { kind: "upgrade_decision", at, data: { decision: "accept", tier: "operator", packs: [] } };
}

describe("qualification machine — Option B invariants", () => {
  it("no capture means no lifecycle at all", () => {
    assert.equal(resolveStage([]), null);
    assert.equal(resolveStage([visit(), answer(), routeShown(), decision()]), null);
  });

  it("capture without consent does not anchor a lifecycle", () => {
    const noConsent: EvidenceItem = { kind: "capture_confirmed", at: T0, data: { source: "register", consent: false } };
    assert.equal(resolveStage([noConsent, visit()]), null);
  });

  it("consented capture resolves to CAPTURED", () => {
    const state = resolveStage([captured()]);
    assert.equal(state?.stage, "CAPTURED");
  });
});

describe("qualification machine — forward-only, no skipping", () => {
  it("walks the full ladder when every gate has evidence", () => {
    const state = resolveStage([captured(), visit(), answer(), routeShown(), decision()]);
    assert.equal(state?.stage, "UPGRADE");
    assert.deepEqual(state?.payload, { tier: "operator", packs: [] });
  });

  it("later-stage evidence without earlier gates does not advance (no skipping)", () => {
    // Decision + route evidence but NO surface visit or answer.
    const state = resolveStage([captured(), routeShown(), decision()]);
    assert.equal(state?.stage, "CAPTURED");
  });

  it("stops at the first missing gate", () => {
    const state = resolveStage([captured(), visit(), routeShown(), decision()]);
    // No answer → QUALIFY gate fails → stays EXPERIENCE even though
    // route/decision evidence exists.
    assert.equal(state?.stage, "EXPERIENCE");
  });
});

describe("qualification machine — no retroactive qualification", () => {
  it("ignores evidence timestamped before the capture anchor", () => {
    const state = resolveStage([
      captured(T0),
      visit(T0 - 100), // pre-capture — inadmissible
    ]);
    assert.equal(state?.stage, "CAPTURED");
  });
});

describe("qualification machine — payload assembly", () => {
  it("EXPERIENCE payload lists distinct surfaces", () => {
    const state = resolveStage([captured(), visit(T0 + 1), visit(T0 + 2), { kind: "surface_visit", at: T0 + 3, data: { page: "/marketplace" } }]);
    assert.equal(state?.stage, "EXPERIENCE");
    assert.deepEqual(state?.payload, { surfacesSeen: ["/onboarding", "/marketplace"] });
  });

  it("QUALIFY payload keys answers by question id, latest wins", () => {
    const state = resolveStage([
      captured(),
      visit(),
      answer(T0 + 20, "objective"),
      { kind: "answer", at: T0 + 25, data: { questionId: "team_size", answer: "org" } },
    ]);
    assert.equal(state?.stage, "QUALIFY");
    assert.deepEqual(state?.payload, { answers: { objective: "security", team_size: "org" } });
  });
});

describe("qualification machine — guards are individually consistent", () => {
  it("each guard implies all earlier guards", () => {
    const full = [captured(), visit(), answer(), routeShown(), decision()];
    assert.equal(STAGE_GUARDS.UPGRADE(full), true);
    assert.equal(STAGE_GUARDS.ROUTE(full), true);
    assert.equal(STAGE_GUARDS.QUALIFY(full), true);
    assert.equal(STAGE_GUARDS.EXPERIENCE(full), true);
    assert.equal(STAGE_GUARDS.CAPTURED(full), true);

    const partial = [captured(), visit()];
    assert.equal(STAGE_GUARDS.QUALIFY(partial), false);
    assert.equal(STAGE_GUARDS.ROUTE(partial), false);
    assert.equal(STAGE_GUARDS.UPGRADE(partial), false);
  });
});

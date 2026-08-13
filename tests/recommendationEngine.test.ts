import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateRecommendation, packItemsFromCatalog } from "../worker/recommendationEngine.ts";
import { resolveEntitlements } from "../worker/entitlementsWorker.ts";
import type { EvidenceItem } from "../src/pearl/qualificationMachine.ts";

const T0 = 1_000_000;
const PACKS = packItemsFromCatalog();

function evidence(...items: Partial<EvidenceItem>[]): EvidenceItem[] {
  return items.map(
    (item, index) =>
      ({ kind: "surface_visit", at: T0 + index, data: {}, ...item }) as EvidenceItem,
  );
}

const CAPTURED = { kind: "capture_confirmed", data: { source: "register", consent: true } } as const;

function resolved(tier: "access" | "operator" | "ops-division" | "enterprise", packs: { kind: string; slug: string }[] = []) {
  return resolveEntitlements("s", tier, {
    packs: packs.map((p) => ({ ...p, grantedAt: "t" })) as never,
    revocations: [],
  });
}

describe("recommendation engine — Option B invariants", () => {
  it("no capture → continue-onboarding, ACCESS recommendation, never a wall", () => {
    const rec = evaluateRecommendation({
      stage: null,
      evidence: [],
      tier: "access",
      resolved: resolved("access"),
      packItems: PACKS,
    });
    assert.equal(rec.nextAction, "continue-onboarding");
    assert.equal(rec.recommendedTier, "access");
    assert.equal(rec.voice, "aurelius");
  });

  it("never recommends below the current tier", () => {
    const rec = evaluateRecommendation({
      stage: "CAPTURED",
      evidence: evidence(CAPTURED),
      tier: "enterprise",
      resolved: resolved("enterprise"),
      packItems: PACKS,
    });
    assert.equal(rec.recommendedTier, "enterprise");
  });

  it("is advisory: output carries no mutation surface (pure data)", () => {
    const rec = evaluateRecommendation({
      stage: "QUALIFY",
      evidence: evidence(CAPTURED, { kind: "answer", data: { questionId: "objective", answer: "security" } }),
      tier: "access",
      resolved: resolved("access"),
      packItems: PACKS,
    });
    assert.ok(rec.justification.length > 0);
    assert.deepEqual(Object.keys(rec).sort(), [
      "advisor",
      "justification",
      "nextAction",
      "recommendedPacks",
      "recommendedTier",
      "voice",
    ]);
  });
});

describe("recommendation engine — tier/pack/nextAction matrix", () => {
  it("wizard accept decision wins the tier recommendation", () => {
    const rec = evaluateRecommendation({
      stage: "UPGRADE",
      evidence: evidence(
        CAPTURED,
        { kind: "surface_visit", data: { page: "/onboarding" } },
        { kind: "answer", data: { questionId: "objective", answer: "security" } },
        { kind: "route_shown", data: { recommendedPath: "cybersecurity", recommendedTier: "operator" } },
        { kind: "upgrade_decision", data: { decision: "accept", tier: "ops-division", packs: [] } },
      ),
      tier: "access",
      resolved: resolved("access"),
      packItems: PACKS,
    });
    assert.equal(rec.recommendedTier, "ops-division");
    assert.equal(rec.nextAction, "upgrade-tier");
    assert.equal(rec.voice, "beacon");
  });

  it("org team size heuristic recommends ops-division when no route exists", () => {
    const rec = evaluateRecommendation({
      stage: "QUALIFY",
      evidence: evidence(
        CAPTURED,
        { kind: "surface_visit", data: { page: "/" } },
        { kind: "answer", data: { questionId: "team_size", answer: "org" } },
      ),
      tier: "access",
      resolved: resolved("access"),
      packItems: PACKS,
    });
    assert.equal(rec.recommendedTier, "ops-division");
    assert.equal(rec.nextAction, "refine-blueprint");
  });

  it("security objective recommends intelligence/scenario packs with tier-aware status", () => {
    const rec = evaluateRecommendation({
      stage: "QUALIFY",
      evidence: evidence(
        CAPTURED,
        { kind: "surface_visit", data: { page: "/" } },
        { kind: "answer", data: { questionId: "objective", answer: "security" } },
      ),
      tier: "operator",
      resolved: resolved("operator"),
      packItems: PACKS,
    });
    const kinds = new Set(rec.recommendedPacks.map((pack) => pack.kind));
    assert.ok(kinds.has("scenario-pack"));
    const scenario = rec.recommendedPacks.find((pack) => pack.kind === "scenario-pack");
    assert.equal(scenario?.status, "eligible");
    const intel = rec.recommendedPacks.find((pack) => pack.kind === "intelligence-pack");
    assert.equal(intel?.status, "needs-tier"); // intelligence requires ops-division
  });

  it("held packs are reported held, not re-recommended as acquirable", () => {
    const scenarioItem = PACKS.find((item) => item.tags?.includes("scenario-pack"));
    const rec = evaluateRecommendation({
      stage: "QUALIFY",
      evidence: evidence(
        CAPTURED,
        { kind: "surface_visit", data: { page: "/" } },
        { kind: "answer", data: { questionId: "objective", answer: "other" } },
      ),
      tier: "operator",
      resolved: resolved("operator", [{ kind: "scenario-pack", slug: scenarioItem?.id ?? "" }]),
      packItems: PACKS,
    });
    const pack = rec.recommendedPacks.find((candidate) => candidate.itemId === scenarioItem?.id);
    assert.equal(pack?.status, "held");
  });

  it("accepted decision at a sufficient tier ends at enter-cockpit (OPERATOR voice)", () => {
    const rec = evaluateRecommendation({
      stage: "UPGRADE",
      evidence: evidence(
        CAPTURED,
        { kind: "surface_visit", data: { page: "/" } },
        { kind: "answer", data: { questionId: "objective", answer: "efficiency" } },
        { kind: "route_shown", data: { recommendedPath: "ai-automation", recommendedTier: "operator" } },
        { kind: "upgrade_decision", data: { decision: "accept", tier: "operator", packs: [] } },
      ),
      tier: "operator",
      resolved: resolved("operator"),
      packItems: PACKS,
    });
    assert.equal(rec.nextAction, "enter-cockpit");
    assert.equal(rec.voice, "operator");
    assert.equal(rec.advisor.eligible, false);
  });
});

describe("upgrade advisor projection", () => {
  it("flags tier + entitlement prerequisites for ACCESS subjects", () => {
    const rec = evaluateRecommendation({
      stage: "QUALIFY",
      evidence: evidence(
        CAPTURED,
        { kind: "surface_visit", data: { page: "/" } },
        { kind: "answer", data: { questionId: "team_size", answer: "org" } },
      ),
      tier: "access",
      resolved: resolved("access"),
      packItems: PACKS,
    });
    assert.equal(rec.advisor.eligible, true);
    assert.ok(rec.advisor.blockedBy.includes("tier-prerequisite"));
    assert.ok(rec.advisor.blockedBy.includes("entitlement-prerequisite"));
    assert.ok(rec.advisor.hint.includes("ACCESS"));
    assert.equal(rec.advisor.voice, "beacon");
  });
});

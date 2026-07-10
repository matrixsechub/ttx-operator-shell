import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateUiUxAudit } from "../worker/data/prismUiuxEngine.ts";
import {
  buildFindingGroupKey,
  computePriorityScore,
  generateTriageItemsFromAudit,
  groupFindingsForTriage,
  highestSeverity,
  routeImportanceWeight,
} from "../worker/data/prismTriageEngine.ts";
import type { UiUxFinding } from "../worker/data/prismUiuxTypes.ts";
import { saveUiUxAudit } from "../worker/prismUiuxStorage.ts";
import { listTriageItemsForAudit, saveTriageItem } from "../worker/prismTriageStorage.ts";

function createMemoryKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
    delete: async (key: string) => {
      store.delete(key);
    },
    list: async () => ({ keys: [], list_complete: true, cacheStatus: null }),
    getWithMetadata: async () => ({ value: null, metadata: null, cacheStatus: null }),
  } as unknown as KVNamespace;
}

describe("PRISM triage engine", () => {
  it("groups findings by route, category, recommendation, and acceptance criteria", async () => {
    const audit = await generateUiUxAudit(
      { mode: "AUDIT_ROUTE", routes: ["/", "/services"], viewport: "mobile", useFixture: true },
      "audit-triage-group",
    );
    const groups = groupFindingsForTriage(audit.findings);
    assert.ok(groups.length >= 1);
    for (const group of groups) {
      const keys = new Set(group.map((f) => buildFindingGroupKey(f)));
      assert.equal(keys.size, 1);
    }
  });

  it("does not group unrelated findings with different recommendations", async () => {
    const audit = await generateUiUxAudit(
      { mode: "AUDIT_ROUTE", routes: ["/enter", "/register"], viewport: "mobile", useFixture: true },
      "audit-triage-unrelated",
    );
    const distinctRecs = new Set(audit.findings.map((f) => f.recommendation));
    if (distinctRecs.size > 1) {
      const groups = groupFindingsForTriage(audit.findings);
      assert.ok(groups.length >= 2);
    }
  });

  it("ranks critical findings above low severity", () => {
    const critical: UiUxFinding = {
      id: "f1",
      auditId: "a",
      route: "/login",
      viewport: "mobile",
      category: "accessibility",
      severity: "critical",
      evidence: [{ type: "fixture", source: "/login", summary: "a11y", capturedAt: "2026-01-01T00:00:00.000Z" }],
      userImpact: "Blocks operator sign-in",
      recommendation: "Fix contrast",
      acceptanceCriteria: ["Contrast passes"],
      confidence: 0.9,
      status: "open",
    };
    const low: UiUxFinding = {
      ...critical,
      id: "f2",
      route: "/about",
      severity: "low",
      category: "visual_hierarchy",
      userImpact: "Minor spacing",
      recommendation: "Adjust padding",
      acceptanceCriteria: ["Spacing aligned"],
    };
    const audit = {
      auditId: "a",
      releaseRecommendation: "CHANGES_REQUIRED" as const,
      routes: ["/login"],
      viewport: "mobile" as const,
      evidenceHash: "hash",
    };
    const criticalScore = computePriorityScore([critical], audit as never);
    const lowScore = computePriorityScore([low], audit as never);
    assert.ok(criticalScore > lowScore);
    assert.equal(highestSeverity([critical]), "critical");
  });

  it("weights accessibility blockers and funnel routes higher", () => {
    const funnel: UiUxFinding = {
      id: "f3",
      auditId: "a",
      route: "/register",
      viewport: "mobile",
      category: "conversion",
      severity: "high",
      evidence: [{ type: "fixture", source: "/register", summary: "cta", capturedAt: "2026-01-01T00:00:00.000Z" }],
      userImpact: "Registration blocked",
      recommendation: "Fix CTA",
      acceptanceCriteria: ["CTA visible"],
      confidence: 0.88,
      status: "open",
    };
    const cosmetic: UiUxFinding = {
      ...funnel,
      id: "f4",
      route: "/about",
      category: "design_system",
      severity: "low",
      userImpact: "Cosmetic drift",
      recommendation: "Token tweak",
      acceptanceCriteria: ["Token match"],
    };
    const audit = {
      auditId: "a",
      releaseRecommendation: "PASS_WITH_ADVISORIES" as const,
      routes: ["/register"],
      viewport: "mobile" as const,
      evidenceHash: "hash",
    };
    assert.ok(computePriorityScore([funnel], audit as never) > computePriorityScore([cosmetic], audit as never));
    assert.ok(routeImportanceWeight("/register") > routeImportanceWeight("/about"));
  });

  it("generates triage idempotently for the same audit", async () => {
    const audit = await generateUiUxAudit(
      { mode: "ACCESSIBILITY_CHECK", routes: ["/enter"], viewport: "mobile", useFixture: true },
      "audit-triage-idem",
    );
    const first = await generateTriageItemsFromAudit(audit);
    const second = await generateTriageItemsFromAudit(audit);
    assert.deepEqual(
      first.map((i) => i.triageId).sort(),
      second.map((i) => i.triageId).sort(),
    );
    for (const item of first) {
      assert.equal(item.advisoryOnly, true);
      assert.equal(item.mutationAuthorized, false);
      assert.equal(item.operatorDecisionRequired, true);
    }
  });

  it("persists bounded triage index without mutating source audit", async () => {
    const env = { TTX_STATE: createMemoryKv() };
    const audit = await generateUiUxAudit(
      { mode: "AUDIT_ROUTE", routes: ["/services"], viewport: "mobile", useFixture: true },
      "audit-triage-persist",
    );
    const beforeHash = audit.evidenceHash;
    await saveUiUxAudit(env, audit);

    const items = await generateTriageItemsFromAudit(audit);
    for (const item of items) {
      await saveTriageItem(env, item);
    }

    const stored = await listTriageItemsForAudit(env, audit.auditId);
    assert.ok(stored.length > 0);

    const { readUiUxAudit } = await import("../worker/prismUiuxStorage.ts");
    const reloaded = await readUiUxAudit(env, audit.auditId);
    assert.equal(reloaded?.evidenceHash, beforeHash);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertPrismCouncilAdvisoryInvariants,
  buildBriefingSummary,
  buildPrismCouncilAdvisoryBundle,
  projectAuditToAdvisoryItem,
  rankAuditSummaries,
} from "../worker/data/prismCouncilAdvisory.ts";
import { generateUiUxAudit } from "../worker/data/prismUiuxEngine.ts";
import type { UiUxAuditSummary } from "../worker/data/prismUiuxTypes.ts";
import { saveUiUxAudit } from "../worker/prismUiuxStorage.ts";

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
    getWithMetadata: async (key: string) => ({ value: store.get(key) ?? null, metadata: null, cacheStatus: null }),
  } as unknown as KVNamespace;
}

describe("PRISM council advisory bridge", () => {
  it("ranks higher-severity release recommendations first", () => {
    const ranked = rankAuditSummaries([
      {
        auditId: "pass",
        mode: "AUDIT_ROUTE",
        routes: ["/"],
        viewport: "mobile",
        overallScore: 90,
        releaseRecommendation: "PASS",
        findingCount: 0,
        criticalCount: 0,
        createdAt: "2026-01-02T00:00:00.000Z",
        evidenceHash: "a",
      },
      {
        auditId: "block",
        mode: "AUDIT_ROUTE",
        routes: ["/"],
        viewport: "mobile",
        overallScore: 40,
        releaseRecommendation: "BLOCK_RELEASE",
        findingCount: 3,
        criticalCount: 2,
        createdAt: "2026-01-01T00:00:00.000Z",
        evidenceHash: "b",
      },
    ] satisfies UiUxAuditSummary[]);

    assert.equal(ranked[0]?.auditId, "block");
  });

  it("projects audits into read-only advisory items with council envelopes", async () => {
    const audit = await generateUiUxAudit(
      { mode: "AUDIT_ROUTE", routes: ["/services"], viewport: "mobile", useFixture: true },
      "audit-council-1",
    );
    const item = projectAuditToAdvisoryItem(audit, 1);

    assert.equal(item.advisoryOnly, true);
    assert.equal(item.mutationAuthorized, false);
    assert.equal(item.councilEnvelope.agentId, "PRISM_UIUX_AGENT_V1");
    assert.match(item.briefingSummary, /PRISM evaluated/);
    assertPrismCouncilAdvisoryInvariants(item);
  });

  it("builds advisory bundles from persisted TTX_STATE audits", async () => {
    const env = { TTX_STATE: createMemoryKv() };
    const audit = await generateUiUxAudit(
      { mode: "ACCESSIBILITY_CHECK", routes: ["/enter"], viewport: "mobile", useFixture: true },
      "audit-council-2",
    );
    await saveUiUxAudit(env, audit, "idem-council-2");

    const bundle = await buildPrismCouncilAdvisoryBundle(env, { limit: 5 });
    assert.equal(bundle.advisoryOnly, true);
    assert.equal(bundle.mutationAuthorized, false);
    assert.equal(bundle.items.length, 1);
    assert.equal(bundle.items[0]?.auditId, "audit-council-2");
    assert.equal(bundle.rankedAuditIds[0], "audit-council-2");
  });

  it("summarizes council envelopes for HSX briefing", async () => {
    const audit = await generateUiUxAudit(
      { mode: "AUDIT_ROUTE", routes: ["/"], viewport: "mobile", useFixture: true },
      "audit-council-3",
    );
    const summary = buildBriefingSummary(audit.councilEnvelope);
    assert.ok(summary.includes(audit.councilEnvelope.problemFrame));
    assert.match(summary, /release/i);
  });
});

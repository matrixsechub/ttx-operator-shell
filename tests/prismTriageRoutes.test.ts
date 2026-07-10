import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { edgeAuthGate } from "../worker/edge/gate.ts";
import { classifyRoute } from "../worker/edge/routeClass.ts";
import { buildTriageSummary } from "../worker/data/prismTriageEngine.ts";
import { redactTelemetryValue } from "../worker/data/prismTriageTelemetry.ts";
import { generateUiUxAudit } from "../worker/data/prismUiuxEngine.ts";
import { rejectExecutionFields } from "../worker/prismTriageRoutes.ts";
import { handlePrismTriageRoute } from "../worker/prismTriageRoutes.ts";
import { PRISM_TRIAGE_STORAGE_LIMITS } from "../worker/prismTriageStorage.ts";
import { saveUiUxAudit } from "../worker/prismUiuxStorage.ts";

function createKv() {
  const store = new Map<string, string>();
  return {
    store,
    kv: {
      async get(key: string) {
        return store.get(key) ?? null;
      },
      async put(key: string, value: string) {
        store.set(key, value);
      },
      async delete(key: string) {
        store.delete(key);
      },
      async list() {
        return { keys: [], list_complete: true, cacheStatus: null };
      },
      async getWithMetadata() {
        return { value: null, metadata: null, cacheStatus: null };
      },
    } as unknown as KVNamespace,
  };
}

const EDGE_SECRET = "test-edge-secret-key-32chars!!";

function envWithKv(kv: KVNamespace) {
  return {
    TTX_STATE: kv,
    AUTH_SIGNING_KEY: EDGE_SECRET,
    OPERATOR_SECRET: EDGE_SECRET,
    AI_FULFILLMENT_ENABLED: "false",
  };
}

describe("PRISM triage routes", () => {
  it("classifies triage and proposal paths as operator-protected", () => {
    assert.equal(classifyRoute("/api/operator/uiux/triage", "GET"), "operator");
    assert.equal(classifyRoute("/api/operator/uiux/triage/generate", "POST"), "operator");
    assert.equal(classifyRoute("/api/operator/uiux/proposals", "GET"), "operator");
    assert.equal(classifyRoute("/api/operator/uiux/triage/triage-abc/disposition", "POST"), "operator");
  });

  it("rejects unauthenticated triage access at edge gate", async () => {
    const res = await edgeAuthGate(
      new Request("https://example.com/api/operator/uiux/triage"),
      "/api/operator/uiux/triage",
      { OPERATOR_SECRET: EDGE_SECRET },
    );
    assert.ok(res);
    assert.equal(res?.status, 401);
  });

  it("rejects execution authority fields in request bodies", () => {
    assert.throws(
      () => rejectExecutionFields({ mutationAuthorized: true }),
      /mutationAuthorized/,
    );
    assert.throws(() => rejectExecutionFields({ deploy: true }), /deploy/);
    assert.throws(() => rejectExecutionFields({ commit: true }), /commit/);
  });

  it("generates triage, proposal, disposition end-to-end without mutating source audit", async () => {
    const { kv } = createKv();
    const env = envWithKv(kv);
    const audit = await generateUiUxAudit(
      { mode: "AUDIT_ROUTE", routes: ["/services"], viewport: "mobile", useFixture: true },
      "audit-routes-e2e",
    );
    const sourceHash = audit.evidenceHash;
    await saveUiUxAudit(env, audit);

    const genRes = await handlePrismTriageRoute(
      new Request("https://example.com/api/operator/uiux/triage/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditId: audit.auditId }),
      }),
      "/api/operator/uiux/triage/generate",
      env,
    );
    assert.ok(genRes);
    assert.equal(genRes?.status, 200);
    const generated = (await genRes!.json()) as {
      sourceAuditUnchanged: boolean;
      items: { triageId: string }[];
      mutationAuthorized: false;
      advisoryOnly: true;
    };
    assert.equal(generated.sourceAuditUnchanged, true);
    assert.equal(generated.mutationAuthorized, false);
    assert.equal(generated.advisoryOnly, true);
    assert.ok(generated.items.length > 0);

    const triageId = generated.items[0]!.triageId;
    const proposalRes = await handlePrismTriageRoute(
      new Request(`https://example.com/api/operator/uiux/triage/${triageId}/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      `/api/operator/uiux/triage/${triageId}/proposals`,
      env,
    );
    assert.ok(proposalRes);
    assert.equal(proposalRes?.status, 200);
    const proposalPayload = (await proposalRes!.json()) as {
      proposal: { proposalId: string; mutationAuthorized: false; advisoryOnly: true };
      sourceAuditUnchanged: boolean;
    };
    assert.equal(proposalPayload.proposal.mutationAuthorized, false);
    assert.equal(proposalPayload.proposal.advisoryOnly, true);
    assert.equal(proposalPayload.sourceAuditUnchanged, true);

    const getProposalRes = await handlePrismTriageRoute(
      new Request(`https://example.com/api/operator/uiux/proposals/${proposalPayload.proposal.proposalId}`),
      `/api/operator/uiux/proposals/${proposalPayload.proposal.proposalId}`,
      env,
    );
    assert.equal(getProposalRes?.status, 200);

    const dispositionRes = await handlePrismTriageRoute(
      new Request(`https://example.com/api/operator/uiux/triage/${triageId}/disposition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted_for_planning", reason: "plan next sprint" }),
      }),
      `/api/operator/uiux/triage/${triageId}/disposition`,
      env,
    );
    assert.equal(dispositionRes?.status, 200);

    const auditRaw = await kv.get(`mshops:uiux:v1:audit:${audit.auditId}`);
    assert.ok(auditRaw);
    const reloaded = JSON.parse(auditRaw) as { evidenceHash: string };
    assert.equal(reloaded.evidenceHash, sourceHash);
  });

  it("redacts sensitive telemetry values", () => {
    assert.equal(redactTelemetryValue("Bearer secret-token"), "[REDACTED]");
    assert.equal(redactTelemetryValue("/route?foo=bar"), "/route");
    assert.equal(redactTelemetryValue("/route?token=abc"), "[REDACTED]");
  });

  it("builds HSX-safe triage summary counts only", async () => {
    const audit = await generateUiUxAudit(
      { mode: "AUDIT_ROUTE", routes: ["/"], viewport: "mobile", useFixture: true },
      "audit-summary",
    );
    const { generateTriageItemsFromAudit } = await import("../worker/data/prismTriageEngine.ts");
    const items = await generateTriageItemsFromAudit(audit);
    const summary = buildTriageSummary(items);
    assert.equal(typeof summary.total, "number");
    assert.equal(typeof summary.operatorDecisionRequired, "number");
    assert.equal("screenshot" in summary, false);
  });

  it("enforces bounded KV index limits", () => {
    assert.equal(PRISM_TRIAGE_STORAGE_LIMITS.MAX_TRIAGE_INDEX, 100);
    assert.equal(PRISM_TRIAGE_STORAGE_LIMITS.MAX_PROPOSAL_INDEX, 100);
  });

  it("operator triage UI contains no execution controls", () => {
    const page = readFileSync("src/pages/ops/PrismTriagePage.tsx", "utf8");
    const panel = readFileSync("src/components/prism/PrismPatchProposalPanel.tsx", "utf8");
    const forbiddenButtonLabels = [
      "Apply patch",
      "Deploy",
      "Commit",
      "Push",
      "Merge",
      "Approve mutation",
    ];
    for (const label of forbiddenButtonLabels) {
      assert.doesNotMatch(page, new RegExp(`>\\s*${label}`, "i"));
      assert.doesNotMatch(panel, new RegExp(`>\\s*${label}`, "i"));
    }
    assert.match(page, /NO MUTATION AUTHORITY/i);
    assert.match(page, /accepted_for_planning/);
  });
});

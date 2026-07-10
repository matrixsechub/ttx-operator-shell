import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { handleRecoveredFunnelApi, isRecoveredPublicRoute, redirectWelcomeToRoot } from "../worker/funnelRecovery.ts";
import { ensureAgentGovernance } from "../msh-ops/agent/initAgentGovernance.ts";
import { ensureBeaconLoaded } from "../msh-ops/beacon/loadBeacon.ts";

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
        return null;
      },
    } as unknown as KVNamespace,
  };
}

describe("funnel route map", () => {
  it("recognizes recovered public routes and rejects unknown routes", () => {
    assert.equal(isRecoveredPublicRoute("/"), true);
    assert.equal(isRecoveredPublicRoute("/services"), true);
    assert.equal(isRecoveredPublicRoute("/apps/automation-builder"), true);
    assert.equal(isRecoveredPublicRoute("/apps/ai-agent-builder"), true);
    assert.equal(isRecoveredPublicRoute("/operator/ai-agent-builds"), true);
    assert.equal(isRecoveredPublicRoute("/apps/security-remediation-planner"), true);
    assert.equal(isRecoveredPublicRoute("/operator/security-remediation"), true);
    assert.equal(isRecoveredPublicRoute("/apps/rag-architecture-planner"), true);
    assert.equal(isRecoveredPublicRoute("/operator/rag-architectures"), true);
    assert.equal(isRecoveredPublicRoute("/apps/local-ai-deployment-planner"), true);
    assert.equal(isRecoveredPublicRoute("/operator/local-ai-deployments"), true);
    assert.equal(isRecoveredPublicRoute("/apps/northstar-beacon"), true);
    assert.equal(isRecoveredPublicRoute("/operator/northstar-beacon-orders"), true);
    assert.equal(isRecoveredPublicRoute("/apps/cloudflare-security-audit-lite"), true);
    assert.equal(isRecoveredPublicRoute("/welcome"), false);
    assert.equal(isRecoveredPublicRoute("/not-real"), false);
  });

  it("redirects /welcome to canonical root", () => {
    const request = new Request("https://example.test/welcome");
    const response = redirectWelcomeToRoot(request, "/welcome");
    assert.ok(response);
    assert.equal(response?.status, 302);
    assert.equal(response?.headers.get("location"), "https://example.test/");
  });
});

describe("recovered funnel API validation", () => {
  before(async () => {
    await ensureBeaconLoaded();
    await ensureAgentGovernance();
  });

  it("requires durable storage for register and engagement writes", async () => {
    const registerResponse = await handleRecoveredFunnelApi(
      new Request("https://example.com/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test", email: "test@example.com", role: "observer", reason: "Need access" }),
      }),
      new URL("https://example.com/api/register"),
      {},
    );
    assert.equal(registerResponse?.status, 503);

    const engagementResponse = await handleRecoveredFunnelApi(
      new Request("https://example.com/api/engagements/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operator_handle: "Test",
          contact_email: "test@example.com",
          transmission: "Need a review",
        }),
      }),
      new URL("https://example.com/api/engagements/create"),
      {},
    );
    assert.equal(engagementResponse?.status, 503);
  });

  it("enforces content type and rejects unsupported fields", async () => {
    const contentTypeResponse = await handleRecoveredFunnelApi(
      new Request("https://example.com/api/service-selector", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ primary_goal: "build_ai_agent" }),
      }),
      new URL("https://example.com/api/service-selector"),
      {},
    );
    assert.equal(contentTypeResponse?.status, 415);

    const { kv } = createKv();
    const unsupportedFieldResponse = await handleRecoveredFunnelApi(
      new Request("https://example.com/api/engagements/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operator_handle: "Test",
          contact_email: "test@example.com",
          transmission: "Need a review",
          unsafe: "nope",
        }),
      }),
      new URL("https://example.com/api/engagements/create"),
      { TTX_STATE: kv },
    );
    assert.equal(unsupportedFieldResponse?.status, 400);
  });

  it("preserves allowlisted context and returns safe status summaries only", async () => {
    const { kv } = createKv();

    const createResponse = await handleRecoveredFunnelApi(
      new Request("https://example.com/api/engagements/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operator_handle: "Operator",
          contact_email: "operator@example.com",
          organization: "MSHOPS",
          transmission: "Need a build review",
          source: "service-selector",
          selector_id: "sel_123",
          source_reference_id: "quote_123",
          quote_id: "quote_123",
          price_range: "$5k-$10k",
          package_tier: "growth",
          risk_score: 88,
          governance_maturity: "developing",
          retrieval_exposure_level: "medium",
          access_control_level: "private",
          automation_roi_id: "auto_123",
          security_event_id: "sec_123",
          security_severity: "high",
        }),
      }),
      new URL("https://example.com/api/engagements/create"),
      { TTX_STATE: kv },
    );

    assert.equal(createResponse?.status, 201);
    const createdBody = (await createResponse?.json()) as {
      engagement_id: string;
      status_lookup_id: string;
      status: string;
    };
    assert.ok(createdBody.engagement_id);
    assert.ok(createdBody.status_lookup_id);
    assert.equal(createdBody.status, "intake-received");

    const aggregateResponse = await handleRecoveredFunnelApi(
      new Request("https://example.com/api/engagements/status", { method: "GET" }),
      new URL("https://example.com/api/engagements/status"),
      { TTX_STATE: kv },
    );
    assert.equal(aggregateResponse?.status, 200);
    const aggregateBody = (await aggregateResponse?.json()) as { engagements_count: number };
    assert.equal(aggregateBody.engagements_count, 1);

    const detailResponse = await handleRecoveredFunnelApi(
      new Request(`https://example.com/api/engagements/status?lookup=${createdBody.status_lookup_id}`, { method: "GET" }),
      new URL(`https://example.com/api/engagements/status?lookup=${createdBody.status_lookup_id}`),
      { TTX_STATE: kv },
    );
    assert.equal(detailResponse?.status, 200);
    const detailBody = (await detailResponse?.json()) as Record<string, unknown>;
    assert.equal(detailBody.engagement_id, createdBody.engagement_id);
    assert.equal(detailBody.status, "intake-received");
    assert.equal("contact_email" in detailBody, false);
    assert.equal("transmission" in detailBody, false);
  });

  it("generates ai agent build specs via public API", async () => {
    const response = await handleRecoveredFunnelApi(
      new Request("https://example.com/api/ai-agent-build-spec-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_type: "manual_agent_request",
          recommended_service: "ai_agent_build",
          agent_goal: "intake_assistant",
          agent_autonomy_level: "draft_only",
          user_interaction_channel: "operator_dashboard",
          tools_needed: ["gmail", "google_sheets"],
          data_types: ["contact_info", "business_info"],
          output_modes: ["task_list", "operator_queue_record"],
          human_approval_required: "before_external_send",
          risk_signals: ["customer_data", "tool_use"],
          memory_requirement: "project_memory",
          deployment_environment: "private_operator_dashboard",
          volume_level: "medium",
          timeline: "this_month",
          budget_band: "7500_15000",
          operator_approval: true,
        }),
      }),
      new URL("https://example.com/api/ai-agent-build-spec-generate"),
      {},
    );
    assert.equal(response?.status, 200);
    const body = (await response?.json()) as Record<string, unknown>;
    assert.match(String(body.ai_agent_build_id), /^agent-build-\d+$/);
    assert.equal(body.agent_name, "Client Intake Agent Spec");
    assert.equal(body.status, "ai-agent-build-spec-complete");
    assert.ok(String(body.next_route).includes("ai_agent_build_id="));
  });

  it("generates security remediation plans via public API", async () => {
    const response = await handleRecoveredFunnelApi(
      new Request("https://example.com/api/security-remediation-plan-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_type: "ai_security_audit",
          risk_description: "Weak access controls on operator dashboard.",
          vulnerability_categories: ["weak_access_controls", "missing_logging"],
          affected_systems: ["operator_dashboard"],
          severity_indicators: ["missing_audit_trail"],
          compliance_targets: ["nist_csf", "cisa", "zero_trust"],
          business_impact: "high",
          exposure_level: "authenticated",
          remediation_scope: "operator_review",
          timeline: "this_month",
          budget_band: "2500_7500",
          operator_approval: true,
        }),
      }),
      new URL("https://example.com/api/security-remediation-plan-generate"),
      {},
    );
    assert.equal(response?.status, 200);
    const body = (await response?.json()) as Record<string, unknown>;
    assert.match(String(body.remediation_plan_id), /^remediation-plan-\d+$/);
    assert.equal(body.status, "security-remediation-plan-complete");
    assert.ok(String(body.next_route).includes("remediation_plan_id="));
    assert.ok(String(body.next_route).includes("compliance_alignment="));
  });

  it("generates RAG architecture plans via public API", async () => {
    const response = await handleRecoveredFunnelApi(
      new Request("https://example.com/api/rag-architecture-plan-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_type: "manual_rag_request",
          use_case: "customer_support",
          data_sources: ["tickets", "crm"],
          data_sensitivity: "internal",
          document_volume: "medium",
          query_patterns: ["single_hop_faq", "citation_required"],
          freshness_requirement: "hourly",
          citation_requirement: "recommended",
          infra_preference: "cloudflare",
          latency_requirement: "low",
          timeline: "this_month",
          budget_band: "2500_7500",
          access_model: "authenticated",
          operator_approval: true,
        }),
      }),
      new URL("https://example.com/api/rag-architecture-plan-generate"),
      {},
    );
    assert.equal(response?.status, 200);
    const body = (await response?.json()) as Record<string, unknown>;
    assert.match(String(body.rag_plan_id), /^rag-plan-\d+$/);
    assert.equal(body.status, "rag-architecture-plan-complete");
    assert.ok(String(body.next_route).includes("rag_plan_id="));
    assert.ok(String(body.next_route).includes("complexity_level="));
  });

  it("generates local AI deployment plans via public API", async () => {
    const response = await handleRecoveredFunnelApi(
      new Request("https://example.com/api/local-ai-deployment-plan-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_type: "manual_request",
          use_case: "private_copilot",
          model_family_preference: "mistral",
          model_size_band: "small_7b",
          hardware_profile: "gpu_workstation",
          hosting_strategy_preference: "local",
          data_sensitivity: "confidential",
          isolation_requirement: "single_tenant",
          concurrent_users: "small_team",
          workload_volume: "moderate",
          latency_requirement: "low",
          timeline: "this_month",
          budget_band: "2500_7500",
          access_model: "authenticated",
          operator_approval: true,
        }),
      }),
      new URL("https://example.com/api/local-ai-deployment-plan-generate"),
      {},
    );
    assert.equal(response?.status, 200);
    const body = (await response?.json()) as Record<string, unknown>;
    assert.match(String(body.deployment_plan_id), /^deployment-plan-\d+$/);
    assert.equal(body.status, "local-ai-deployment-plan-complete");
    assert.ok(String(body.next_route).includes("deployment_plan_id="));
    assert.ok(String(body.next_route).includes("complexity_level="));
  });
});

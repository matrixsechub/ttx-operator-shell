import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { handleRecoveredFunnelApi, isRecoveredPublicRoute } from "../worker/funnelRecovery.ts";
import { isPublicApiRoute } from "../worker/apiAuth.ts";
import { classifyRoute } from "../worker/edge/routeClass.ts";
import { ensureAgentGovernance } from "../msh-ops/agent/initAgentGovernance.ts";
import { ensureBeaconLoaded } from "../msh-ops/beacon/loadBeacon.ts";
import {
  createNorthstarBeaconProposal,
  generateNorthstarBeaconPackage,
  hashNorthstarBeaconConfiguration,
  listNorthstarBeaconOrders,
  northstarBeaconGovernanceMarketplaceModule,
  recordNorthstarBeaconOrder,
  validateNorthstarBeaconConfiguration,
} from "../worker/data/northstarBeaconGovernanceAgent.ts";
import { validateCustomerBeaconDocument } from "../worker/data/customerBeacon/schema.ts";

const SAMPLE_INTAKE = {
  organization_name: "Test Agency",
  strategic_northstar: "Deliver trustworthy multi-agent automation with operator approval gates.",
  strategic_axis: ["STABILITY", "TRUST", "CONTROLLED_GROWTH"],
  priorities: ["Operator approval", "Hash verification", "Audit logging"],
  prohibited_actions: ["Autonomous production deploy"],
  approval_required_actions: ["State mutation"],
  agent_roles: ["planner", "reviewer"],
  agent_permissions: ["read_beacon"],
  allowed_governance_sources: ["pieces-os-mcp"],
  mutation_policy: "operator-only-manual-apply",
  escalation_rules: ["Deviation from axis"],
  recursion_depth_limit: 2,
  termination_conditions: ["Safe mode"],
  audit_requirements: ["Log proposals"],
  deployment_environment: "cloudflare_workers",
  preferred_language: "typescript",
  selected_tier: "beacon-governance-pro" as const,
  source_route: "/apps/northstar-beacon",
  operator_approval: true,
};

describe("northstar beacon marketplace routes", () => {
  it("recognizes public and operator recovered routes", () => {
    assert.equal(isRecoveredPublicRoute("/apps/northstar-beacon"), true);
    assert.equal(isRecoveredPublicRoute("/operator/northstar-beacon-orders"), true);
  });
});

describe("northstar beacon governance agent", () => {
  before(async () => {
    await ensureBeaconLoaded();
    await ensureAgentGovernance();
  });

  it("registers marketplace catalog metadata", () => {
    assert.equal(northstarBeaconGovernanceMarketplaceModule.id, "northstar-beacon-governance-app");
    assert.equal(northstarBeaconGovernanceMarketplaceModule.slug, "northstar-beacon");
    assert.equal(northstarBeaconGovernanceMarketplaceModule.status, "active");
    assert.equal(northstarBeaconGovernanceMarketplaceModule.fulfillmentType, "generated-governance-package");
  });

  it("generates a valid customer beacon package without internal leakage", async () => {
    const order = await generateNorthstarBeaconPackage(SAMPLE_INTAKE);
    recordNorthstarBeaconOrder(order);

    assert.match(order.order_id, /^beacon-order-\d+$/);
    assert.equal(order.status, "package-generated");
    assert.ok(order.integrity_hash.length === 64);
    assert.equal(order.northstar_alignment.internal_beacon_leaked, false);
    assert.equal(order.northstar_alignment.mutation_allowed, false);

    const serialized = JSON.stringify(order.files);
    assert.doesNotMatch(serialized, /BEACON::NORTHSTAR/);
    assert.doesNotMatch(serialized, /msh-ops\/beacon\/northstar\.json/);

    const internalBeacon = readFileSync(resolve("msh-ops/beacon/northstar.json"), "utf8");
    for (const file of order.files) {
      assert.doesNotMatch(file.content, new RegExp(internalBeacon.slice(0, 40).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.doesNotMatch(file.content, /AUTH_SIGNING_KEY|OPERATOR_PASSWORD_HASH/);
    }

    const northstarFile = order.files.find((file) => file.path.endsWith("northstar.json"));
    assert.ok(northstarFile);
    const beacon = validateCustomerBeaconDocument(JSON.parse(northstarFile.content));
    assert.equal(beacon.autonomy.mutationAllowed, false);
    assert.equal(beacon.authority.agentExecutionRequiresApproval, true);
  });

  it("rejects invalid schema configurations", async () => {
    const result = await validateNorthstarBeaconConfiguration({
      version: "1.0.0",
      state: "active",
      autonomy: { mutationAllowed: true },
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("generates and verifies hash", async () => {
    const order = await generateNorthstarBeaconPackage({
      ...SAMPLE_INTAKE,
      selected_tier: "beacon-core",
    });
    const northstarFile = order.files.find((file) => file.path.endsWith("northstar.json"));
    assert.ok(northstarFile);
    const beacon = JSON.parse(northstarFile.content);
    const hashResult = await hashNorthstarBeaconConfiguration(beacon);
    assert.equal(hashResult.hash, order.integrity_hash);
  });

  it("creates proposals without mutating active beacon", async () => {
    const order = await generateNorthstarBeaconPackage(SAMPLE_INTAKE);
    recordNorthstarBeaconOrder(order);
    const beforeHash = order.integrity_hash;

    const proposal = await createNorthstarBeaconProposal({
      order_id: order.order_id,
      source_id: "pieces-os-mcp",
      payload_type: "governance-signal",
      rationale: "Operator review requested",
      signal_message: "Alignment drift detected",
    });

    assert.equal(proposal.status, "pending_operator_approval");
    assert.equal(listNorthstarBeaconOrders()[0].integrity_hash, beforeHash);
  });

  it("rejects identical northstar-update proposals", async () => {
    const order = await generateNorthstarBeaconPackage(SAMPLE_INTAKE);
    recordNorthstarBeaconOrder(order);
    const northstarFile = order.files.find((file) => file.path.endsWith("northstar.json"));
    assert.ok(northstarFile);
    const beacon = JSON.parse(northstarFile.content);

    await assert.rejects(
      () =>
        createNorthstarBeaconProposal({
          order_id: order.order_id,
          source_id: "pieces-os-mcp",
          payload_type: "northstar-update",
          rationale: "No-op update",
          proposed_beacon: beacon,
        }),
      /identical to active customer beacon/,
    );
  });

  it("generates via public API with operator approval", async () => {
    const response = await handleRecoveredFunnelApi(
      new Request("https://example.com/api/northstar-beacon/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...SAMPLE_INTAKE, operator_approval: true }),
      }),
      new URL("https://example.com/api/northstar-beacon/generate"),
      {},
    );
    assert.equal(response?.status, 200);
    const body = (await response?.json()) as Record<string, unknown>;
    assert.equal(body.status, "northstar-beacon-package-complete");
    assert.match(String(body.order_id), /^beacon-order-\d+$/);
    assert.ok(String(body.next_route).includes("beacon_order_id="));
  });

  it("includes module in marketplace service-modules catalog", async () => {
    const response = await handleRecoveredFunnelApi(
      new Request("https://example.com/api/marketplace/service-modules"),
      new URL("https://example.com/api/marketplace/service-modules"),
      {},
    );
    assert.equal(response?.status, 200);
    const body = (await response?.json()) as { modules: Array<{ id: string }> };
    assert.ok(body.modules.some((module) => module.id === "northstar-beacon-governance-app"));
  });

  it("classifies operator northstar routes as protected", () => {
    assert.equal(classifyRoute("/api/operator/northstar-beacon-orders", "GET"), "operator");
    assert.equal(classifyRoute("/api/operator/northstar-beacon-proposals", "GET"), "operator");
    assert.equal(isPublicApiRoute("/api/operator/northstar-beacon-orders", "GET"), false);
    assert.equal(isPublicApiRoute("/api/northstar-beacon/generate", "POST"), true);
  });
});

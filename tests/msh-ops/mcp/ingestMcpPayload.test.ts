import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import northstarDocument from "../../../msh-ops/beacon/northstar.json" with { type: "json" };
import { EXPECTED_BEACON_SHA256 } from "../../../msh-ops/beacon/beaconIntegrity.ts";
import { ensureBeaconLoaded } from "../../../msh-ops/beacon/loadBeacon.ts";
import { ensureAgentGovernance } from "../../../msh-ops/agent/initAgentGovernance.ts";
import {
  clearMcpProposalLogForTests,
  listMcpProposalLog,
} from "../../../msh-ops/mcp/proposalLog.ts";
import {
  ingestMcpPayload,
  ingestPiecesMcpGovernanceFeed,
  reviewBeaconProposal,
} from "../../../msh-ops/mcp/ingestMcpPayload.ts";
import {
  getMcpSourceRegistry,
  validateMcpPayload,
} from "../../../msh-ops/mcp/validateMcpPayload.ts";

function alteredBeacon() {
  return {
    ...northstarDocument,
    priorities: [
      ...northstarDocument.priorities.slice(0, 5),
      "Recursive systems require depth limits, termination conditions, escalation controls, and operator sign-off.",
    ],
  };
}

describe("MCP source registry", () => {
  it("registers pieces-os-mcp as read-only governance source", () => {
    const registry = getMcpSourceRegistry();
    const source = registry.sources.find((entry) => entry.id === "pieces-os-mcp");
    assert.ok(source);
    assert.equal(source.mutationRights, "none");
    assert.equal(source.approvalRequired, true);
    assert.deepEqual(source.allowedPayloadTypes, ["northstar-update", "governance-signal"]);
  });
});

describe("validateMcpPayload", () => {
  before(async () => {
    await ensureBeaconLoaded();
  });

  it("rejects unregistered sources and disallowed payload types", () => {
    const result = validateMcpPayload({
      sourceId: "unknown-source",
      payloadType: "northstar-update",
      proposedAt: new Date().toISOString(),
      proposedBeacon: alteredBeacon(),
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("not registered")));
  });

  it("rejects payloads that claim mutation rights", () => {
    const result = validateMcpPayload({
      sourceId: "pieces-os-mcp",
      payloadType: "northstar-update",
      proposedAt: new Date().toISOString(),
      mutationRights: "write",
      proposedBeacon: alteredBeacon(),
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("mutationRights")));
  });

  it("validates governance-signal payloads against beacon axis", () => {
    const result = validateMcpPayload({
      sourceId: "pieces-os-mcp",
      payloadType: "governance-signal",
      proposedAt: new Date().toISOString(),
      signal: {
        axis: "TRUST",
        priorityIndex: 2,
        message: "Audit logging gaps detected in operator queue writes",
        severity: "high",
      },
    });
    assert.equal(result.valid, true);
    assert.equal(result.payload?.payloadType, "governance-signal");
  });

  it("rejects northstar-update payloads identical to active beacon", () => {
    const result = validateMcpPayload({
      sourceId: "pieces-os-mcp",
      payloadType: "northstar-update",
      proposedAt: new Date().toISOString(),
      proposedBeacon: northstarDocument,
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("identical")));
  });
});

describe("ingestMcpPayload", () => {
  before(async () => {
    await ensureBeaconLoaded();
    await ensureAgentGovernance();
    clearMcpProposalLogForTests();
  });

  it("creates pending proposals without mutating the beacon", async () => {
    const beforeHash = EXPECTED_BEACON_SHA256;
    const result = await ingestMcpPayload({
      sourceId: "pieces-os-mcp",
      payloadType: "northstar-update",
      proposedAt: new Date().toISOString(),
      rationale: "Pieces MCP recommends priority #6 clarification",
      proposedBeacon: alteredBeacon(),
    });

    assert.equal(result.accepted, true);
    assert.ok(result.proposal);
    assert.equal(result.proposal?.status, "pending_operator_approval");
    assert.equal(result.proposal?.mutationRights, "none");
    assert.notEqual(result.proposal?.proposedBeaconHash, beforeHash);
    assert.equal((await ensureBeaconLoaded()).integrityHash, beforeHash);
    assert.equal(listMcpProposalLog().length, 1);
  });

  it("ingests governance signals as advisory proposals", async () => {
    const result = await ingestMcpPayload({
      sourceId: "pieces-os-mcp",
      payloadType: "governance-signal",
      proposedAt: new Date().toISOString(),
      signal: {
        axis: "STABILITY",
        priorityIndex: 0,
        message: "Defer marketplace module expansion until revenue validation completes",
        severity: "medium",
      },
    });
    assert.equal(result.accepted, true);
    assert.equal(result.proposal?.payloadType, "governance-signal");
    assert.equal(result.proposal?.governanceSignal?.axis, "STABILITY");
  });

  it("loads Pieces MCP feed through fetcher without direct beacon mutation", async () => {
    clearMcpProposalLogForTests();
    const results = await ingestPiecesMcpGovernanceFeed(async () => ({
      sourceId: "pieces-os-mcp",
      fetchedAt: new Date().toISOString(),
      payloads: [
        {
          sourceId: "pieces-os-mcp",
          payloadType: "governance-signal",
          proposedAt: new Date().toISOString(),
          signal: {
            axis: "TRUST",
            message: "Enable additional audit telemetry on fulfillment routes",
            severity: "info",
          },
        },
      ],
    }));
    assert.equal(results.length, 1);
    assert.equal(results[0]?.accepted, true);
    assert.equal(listMcpProposalLog().length, 1);
  });

  it("requires operator approval to mark proposals approved", async () => {
    clearMcpProposalLogForTests();
    const ingested = await ingestMcpPayload({
      sourceId: "pieces-os-mcp",
      payloadType: "governance-signal",
      proposedAt: new Date().toISOString(),
      proposalId: "mcp-proposal-review-test",
      signal: {
        axis: "TRUST",
        message: "Review operator approval gates on public intake",
        severity: "low",
      },
    });
    assert.equal(ingested.accepted, true);

    const denied = reviewBeaconProposal({
      proposalId: "mcp-proposal-review-test",
      operatorApproval: false,
    });
    assert.equal(denied.status, "denied");

    clearMcpProposalLogForTests();
    await ingestMcpPayload({
      sourceId: "pieces-os-mcp",
      payloadType: "governance-signal",
      proposedAt: new Date().toISOString(),
      proposalId: "mcp-proposal-approve-test",
      signal: {
        axis: "TRUST",
        message: "Approved advisory signal",
        severity: "info",
      },
    });

    const approved = reviewBeaconProposal({
      proposalId: "mcp-proposal-approve-test",
      operatorApproval: true,
    });
    assert.equal(approved.status, "approved");
    assert.match(approved.reviewNote ?? "", /not mutated automatically/i);
  });
});

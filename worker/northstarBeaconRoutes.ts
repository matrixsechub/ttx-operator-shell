import { getAgentGovernanceContextFor } from "../msh-ops/agent/initAgentGovernance";
import { checkAutonomy } from "../msh-ops/governance/checkAutonomy";
import {
  createNorthstarBeaconProposal,
  generateNorthstarBeaconPackage,
  hashNorthstarBeaconConfiguration,
  listNorthstarBeaconOrders,
  listNorthstarBeaconProposals,
  normalizeNorthstarBeaconIntake,
  northstarBeaconGovernanceMarketplaceModule,
  NORTHSTAR_BEACON_TIERS,
  recordNorthstarBeaconOrder,
  validateNorthstarBeaconConfiguration,
  validateNorthstarBeaconIntake,
  verifyNorthstarBeaconHash,
  AGENT_ID,
} from "./data/northstarBeaconGovernanceAgent";

function jsonResponse(payload: unknown, status = 200): Response {
  return Response.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

async function readJsonBody(request: Request, maxBytes = 48_768): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("Content-Type must be application/json");
  }
  const raw = await request.text();
  if (raw.length > maxBytes) {
    throw new Error("Payload too large");
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON body must be an object");
  }
  return parsed as Record<string, unknown>;
}

function trackNorthstarBeaconEvent(event: string, metadata: Record<string, string> = {}): void {
  console.warn(`[NORTHSTAR_BEACON_TELEMETRY] event=${event} ${Object.entries(metadata).map(([k, v]) => `${k}=${v}`).join(" ")}`);
}

export async function handleNorthstarBeaconApi(
  request: Request,
  pathname: string,
  method: string,
): Promise<Response | null> {
  if (method === "GET" && pathname === "/api/northstar-beacon/catalog") {
    trackNorthstarBeaconEvent("marketplace_page_view");
    return jsonResponse({
      listing: northstarBeaconGovernanceMarketplaceModule,
      tiers: NORTHSTAR_BEACON_TIERS,
    });
  }

  if (method === "POST" && pathname === "/api/northstar-beacon/validate") {
    try {
      const payload = await readJsonBody(request);
      trackNorthstarBeaconEvent("intake_validation");
      const result =
        typeof payload.organization_name === "string" || Array.isArray(payload.priorities)
          ? await validateNorthstarBeaconIntake(payload)
          : await validateNorthstarBeaconConfiguration(payload.beacon ?? payload);
      return jsonResponse(result, result.valid ? 200 : 400);
    } catch (error) {
      const message = error instanceof Error ? error.message : "validation-failed";
      return jsonResponse({ valid: false, errors: [message] }, 400);
    }
  }

  if (method === "POST" && pathname === "/api/northstar-beacon/hash") {
    try {
      const payload = await readJsonBody(request);
      const result = await hashNorthstarBeaconConfiguration(payload.beacon ?? payload);
      if (typeof payload.expected_hash === "string") {
        const verified = result.hash === payload.expected_hash;
        return jsonResponse({ ...result, verified }, verified ? 200 : 409);
      }
      return jsonResponse(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "hash-failed";
      return jsonResponse({ error: message }, 400);
    }
  }

  if (method === "POST" && pathname === "/api/northstar-beacon/generate") {
    try {
      const payload = await readJsonBody(request);
      trackNorthstarBeaconEvent("tier_selection", {
        tier: String(payload.selected_tier ?? "beacon-core"),
      });
      const governance = getAgentGovernanceContextFor(AGENT_ID);
      const generateDecision = checkAutonomy(
        {
          agentId: AGENT_ID,
          actionKind: "advisory",
          description: "Generate customer beacon governance package",
          axis: "TRUST",
          priorityIndex: 2,
        },
        governance,
      );
      if (generateDecision.decision === "denied") {
        return jsonResponse({ error: generateDecision.reason, code: "BEACON_SAFE_MODE" }, 403);
      }

      const input = normalizeNorthstarBeaconIntake(payload);
      const order = await generateNorthstarBeaconPackage(input);
      const recordDecision = checkAutonomy(
        {
          agentId: AGENT_ID,
          actionKind: "mutate_state",
          description: "Record generated beacon package order",
          axis: "STABILITY",
          priorityIndex: 0,
          operatorApproval: payload.operator_approval === true,
        },
        governance,
      );
      if (recordDecision.decision === "denied") {
        return jsonResponse({ error: recordDecision.reason, code: "BEACON_SAFE_MODE" }, 403);
      }
      if (recordDecision.decision === "escalate") {
        return jsonResponse({ error: recordDecision.reason, code: "BEACON_AUTONOMY_ESCALATE" }, 409);
      }

      const recorded = recordNorthstarBeaconOrder(order);
      trackNorthstarBeaconEvent("package_generation", {
        order_id: recorded.order_id,
        tier: recorded.selected_tier,
        file_count: String(recorded.file_count),
      });
      if (recorded.assisted_implementation) {
        trackNorthstarBeaconEvent("assisted_implementation_request", { order_id: recorded.order_id });
      }

      return jsonResponse({
        ...recorded,
        status: "northstar-beacon-package-complete",
        listing: {
          id: northstarBeaconGovernanceMarketplaceModule.id,
          slug: northstarBeaconGovernanceMarketplaceModule.slug,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "northstar-beacon-generate-failed";
      return jsonResponse({ error: message }, 400);
    }
  }

  if (method === "POST" && pathname === "/api/northstar-beacon/proposal") {
    try {
      const payload = await readJsonBody(request);
      const governance = getAgentGovernanceContextFor(AGENT_ID);
      const proposalDecision = checkAutonomy(
        {
          agentId: AGENT_ID,
          actionKind: "advisory",
          description: "Create governance proposal without beacon mutation",
          axis: "TRUST",
        },
        governance,
      );
      if (proposalDecision.decision === "denied") {
        return jsonResponse({ error: proposalDecision.reason }, 403);
      }

      const proposal = await createNorthstarBeaconProposal({
        order_id: String(payload.order_id ?? ""),
        source_id: String(payload.source_id ?? "pieces-os-mcp"),
        payload_type:
          payload.payload_type === "northstar-update" ? "northstar-update" : "governance-signal",
        rationale: String(payload.rationale ?? "Governance proposal"),
        signal_message: typeof payload.signal_message === "string" ? payload.signal_message : undefined,
        proposed_beacon: payload.proposed_beacon,
        operator_approval: payload.operator_approval === true,
      });

      trackNorthstarBeaconEvent("proposal_created", {
        order_id: proposal.order_id,
        payload_type: proposal.payload_type,
      });

      return jsonResponse({
        proposal,
        mutation_applied: false,
        note: "Proposal recorded. Operator must manually apply approved beacon changes.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "proposal-failed";
      return jsonResponse({ error: message }, 400);
    }
  }

  return null;
}

export function handleOperatorNorthstarBeaconApi(pathname: string, method: string): Response | null {
  if (method === "GET" && pathname === "/api/operator/northstar-beacon-orders") {
    return jsonResponse({ rows: listNorthstarBeaconOrders() });
  }
  if (method === "GET" && pathname === "/api/operator/northstar-beacon-proposals") {
    return jsonResponse({ rows: listNorthstarBeaconProposals() });
  }
  return null;
}

export { northstarBeaconGovernanceMarketplaceModule, verifyNorthstarBeaconHash };

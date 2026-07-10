import { getAccessTokenOperator, type AuthEnv } from "./auth";
import { getAgentGovernanceContext } from "../msh-ops/agent/initAgentGovernance";
import { getCodexManifestSnapshot } from "./codex/manifestHash";
import { buildEvidenceBundle, listRecentAuditEvents, recordAuditEvent } from "./governance/auditStore";
import {
  actionClassRequiresApproval,
  validateProposalEligibility,
} from "./governance/policyGate";
import {
  findReceiptForProposal,
  getProposal,
  listProposals,
  saveApprovalReceipt,
  saveProposal,
  updateProposalStatus,
} from "./governance/proposalStore";
import { buildReceiptFromProposal, finalizeApprovalReceipt } from "./governance/approvalReceipt";
import { computeProposalActionDigest } from "./governance/proposalActionDigest";
import { resolveGovernanceReceiptSigningKey } from "./governance/signingKeys";
import { resolveBeaconRuntimeState } from "./governance/beaconRuntime";
import type { ActionProposal, ProposalStatus } from "./governance/types";
import { defaultNorthstarImpact } from "./governance/types";
import type { AuditDbEnv } from "./governance/auditStore";
import type { BuildInfoEnv } from "./buildInfo";
import type { ModeEnv } from "./mode";
import { resolveRuntimeEnvironment } from "./governance/runtimeEnv";
import { buildTelemetryEvent, emitGovernanceTelemetry } from "./governance/governanceTelemetry";

export type GovernanceRouteEnv = AuditDbEnv &
  AuthEnv &
  ModeEnv &
  BuildInfoEnv & {
    BEACON_SIGNING_KEY?: string;
    GOVERNANCE_RECEIPT_SIGNING_KEY?: string;
  };

const MAX_BODY_BYTES = 48_768;
const DEFAULT_EXPIRY_MS = 1000 * 60 * 60 * 24 * 7;

function jsonResponse(payload: unknown, status = 200): Response {
  return Response.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) throw new Error("Payload too large");
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON body must be an object");
  }
  return parsed as Record<string, unknown>;
}

function requireGovernanceSigning(env: GovernanceRouteEnv) {
  const signing = resolveGovernanceReceiptSigningKey(env);
  if (!signing) throw new Error("GOVERNANCE_RECEIPT_SIGNING_KEY not configured");
  return signing;
}

function parseProposalInput(body: Record<string, unknown>, createdBy: string): ActionProposal {
  const governance = getAgentGovernanceContext();
  const now = new Date();
  const expiration =
    typeof body.expiration === "string"
      ? body.expiration
      : new Date(now.getTime() + DEFAULT_EXPIRY_MS).toISOString();

  const actionClass = typeof body.action_class === "string" ? body.action_class : "C3";
  if (!/^C[0-6]$/.test(actionClass)) {
    throw new Error("action_class must be C0 through C6");
  }

  return {
    proposal_id: crypto.randomUUID(),
    revision: 1,
    created_by: createdBy,
    created_at: now.toISOString(),
    target_system: typeof body.target_system === "string" ? body.target_system : "unknown",
    action_class: actionClass as ActionProposal["action_class"],
    summary: typeof body.summary === "string" ? body.summary.trim() : "",
    intended_outcome: typeof body.intended_outcome === "string" ? body.intended_outcome.trim() : "",
    northstar_impact:
      body.northstar_impact && typeof body.northstar_impact === "object" && !Array.isArray(body.northstar_impact)
        ? (body.northstar_impact as ActionProposal["northstar_impact"])
        : defaultNorthstarImpact(),
    evidence_refs: Array.isArray(body.evidence_refs)
      ? body.evidence_refs.filter((entry): entry is string => typeof entry === "string")
      : [],
    risk_score:
      body.risk_score && typeof body.risk_score === "object" && !Array.isArray(body.risk_score)
        ? (body.risk_score as ActionProposal["risk_score"])
        : { numeric: 50, qualitative: "medium" },
    rollback_plan: typeof body.rollback_plan === "string" ? body.rollback_plan.trim() : "",
    affected_data: Array.isArray(body.affected_data)
      ? body.affected_data.filter((entry): entry is string => typeof entry === "string")
      : [],
    affected_users:
      body.affected_users === "internal" ||
      body.affected_users === "customer" ||
      body.affected_users === "system" ||
      body.affected_users === "mixed"
        ? body.affected_users
        : "internal",
    required_approver: "operator",
    beacon_hash: typeof body.beacon_hash === "string" ? body.beacon_hash : governance.integrityHash,
    codex_hash: typeof body.codex_hash === "string" ? body.codex_hash : "",
    expiration,
    status: actionClassRequiresApproval(actionClass as ActionProposal["action_class"])
      ? "pending"
      : "approved",
    action_payload:
      body.action_payload && typeof body.action_payload === "object" && !Array.isArray(body.action_payload)
        ? (body.action_payload as Record<string, unknown>)
        : undefined,
  };
}

export async function handleGovernanceProposalRoute(
  request: Request,
  pathname: string,
  method: string,
  env: GovernanceRouteEnv,
): Promise<Response | null> {
  if (pathname === "/api/governance/proposals" && method === "GET") {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") as ProposalStatus | null;
    const proposals = await listProposals(env, status ?? undefined);
    return jsonResponse({ ok: true, proposals });
  }

  if (pathname === "/api/governance/proposals" && method === "POST") {
    try {
      const operator = await getAccessTokenOperator(request, env);
      const body = await readJsonBody(request);
      const codex = await getCodexManifestSnapshot();
      const proposal = parseProposalInput(body, operator?.handle ?? "system");
      if (!proposal.codex_hash) proposal.codex_hash = codex.manifestHash;

      const gate = await validateProposalEligibility(proposal, env);
      if (!gate.allowed) {
        return jsonResponse({ ok: false, error: gate.reason, code: gate.code }, 403);
      }

      const saved = await saveProposal(env, proposal);
      await recordAuditEvent(env, {
        event_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        actor_type: operator ? "operator" : "agent",
        actor_id: operator?.handle ?? proposal.created_by,
        operator_id: operator?.id,
        action_class: proposal.action_class,
        system_target: proposal.target_system,
        beacon_hash: proposal.beacon_hash,
        codex_hash: proposal.codex_hash,
        trace_id: crypto.randomUUID(),
        proposal_id: proposal.proposal_id,
        event_type: "governance.proposal.created",
        risk_score: proposal.risk_score.numeric,
        result: "success",
      });
      await emitGovernanceTelemetry(
        env,
        buildTelemetryEvent("governance.proposal.created", {
          proposalId: proposal.proposal_id,
          beaconHash: proposal.beacon_hash,
          codexHash: proposal.codex_hash,
          environment: resolveRuntimeEnvironment(env),
          actionClass: proposal.action_class,
          outcome: "created",
          correlationId: crypto.randomUUID(),
        }),
      );

      return jsonResponse({ ok: true, proposal: saved }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "proposal-create-failed";
      return jsonResponse({ ok: false, error: message }, 400);
    }
  }

  const approveMatch = pathname.match(/^\/api\/governance\/proposals\/([^/]+)\/approve$/);
  if (approveMatch && method === "POST") {
    try {
      const operator = await getAccessTokenOperator(request, env);
      if (!operator) return jsonResponse({ ok: false, error: "Operator authentication required" }, 401);

      const beaconState = await resolveBeaconRuntimeState(env);
      if (beaconState.status !== "verified_v2") {
        const code = beaconState.status === "legacy_v1" ? "SIGNED_BEACON_NOT_ACTIVE" : "BEACON_UNVERIFIED";
        return jsonResponse({ ok: false, error: "Beacon verification failed", code }, 503);
      }

      const proposalId = approveMatch[1];
      const proposal = await getProposal(env, proposalId);
      if (!proposal) return jsonResponse({ ok: false, error: "Proposal not found" }, 404);

      const gate = await validateProposalEligibility(proposal, env);
      if (!gate.allowed) {
        return jsonResponse({ ok: false, error: gate.reason, code: gate.code }, 409);
      }

      const environment = resolveRuntimeEnvironment(env);
      const body = await readJsonBody(request);
      const actionDigest = await computeProposalActionDigest(proposal, environment, {
        actionType: typeof body.actionType === "string" ? body.actionType : undefined,
        mutationPayload:
          body.mutationPayload && typeof body.mutationPayload === "object" && !Array.isArray(body.mutationPayload)
            ? (body.mutationPayload as Record<string, unknown>)
            : undefined,
      });
      const approvalId = crypto.randomUUID();
      const approvedAt = new Date().toISOString();
      const unsigned = buildReceiptFromProposal(proposal, {
        approvalId,
        actionDigest,
        approvedBy: operator.handle,
        approvedAt,
        expiresAt: proposal.expiration,
        nonce: crypto.randomUUID(),
        targetEnvironment: environment,
      });
      const receipt = await finalizeApprovalReceipt(unsigned, requireGovernanceSigning(env));

      await saveApprovalReceipt(env, receipt);
      const updated = await updateProposalStatus(env, proposalId, "approved", { approval_id: approvalId });
      await recordAuditEvent(env, {
        event_id: crypto.randomUUID(),
        timestamp: approvedAt,
        actor_type: "operator",
        actor_id: operator.handle,
        operator_id: operator.id,
        action_class: proposal.action_class,
        system_target: proposal.target_system,
        beacon_hash: proposal.beacon_hash,
        codex_hash: proposal.codex_hash,
        trace_id: crypto.randomUUID(),
        proposal_id: proposal.proposal_id,
        approval_id: approvalId,
        event_type: "governance.proposal.approved",
        risk_score: proposal.risk_score.numeric,
        result: "success",
      });
      await emitGovernanceTelemetry(
        env,
        buildTelemetryEvent("governance.proposal.approved", {
          proposalId: proposal.proposal_id,
          approvalId,
          beaconHash: proposal.beacon_hash,
          codexHash: proposal.codex_hash,
          environment,
          actionClass: proposal.action_class,
          outcome: "approved",
          correlationId: crypto.randomUUID(),
        }),
      );
      await emitGovernanceTelemetry(
        env,
        buildTelemetryEvent("governance.receipt.issued", {
          proposalId: proposal.proposal_id,
          approvalId,
          beaconHash: proposal.beacon_hash,
          codexHash: proposal.codex_hash,
          environment,
          actionClass: proposal.action_class,
          outcome: "issued",
          correlationId: crypto.randomUUID(),
        }),
      );

      return jsonResponse({ ok: true, proposal: updated, receipt });
    } catch (error) {
      const message = error instanceof Error ? error.message : "proposal-approve-failed";
      return jsonResponse({ ok: false, error: message }, 400);
    }
  }

  const denyMatch = pathname.match(/^\/api\/governance\/proposals\/([^/]+)\/deny$/);
  if (denyMatch && method === "POST") {
    try {
      const operator = await getAccessTokenOperator(request, env);
      if (!operator) return jsonResponse({ ok: false, error: "Operator authentication required" }, 401);

      const body = await readJsonBody(request);
      const reason = typeof body.reason === "string" ? body.reason.trim() : "denied by operator";
      const proposalId = denyMatch[1];
      const updated = await updateProposalStatus(env, proposalId, "denied", { denial_reason: reason });
      if (!updated) return jsonResponse({ ok: false, error: "Proposal not found" }, 404);

      await recordAuditEvent(env, {
        event_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        actor_type: "operator",
        actor_id: operator.handle,
        operator_id: operator.id,
        action_class: updated.action_class,
        system_target: updated.target_system,
        beacon_hash: updated.beacon_hash,
        codex_hash: updated.codex_hash,
        trace_id: crypto.randomUUID(),
        proposal_id: updated.proposal_id,
        event_type: "governance.proposal.denied",
        reason_code: reason,
        risk_score: updated.risk_score.numeric,
        result: "denied",
      });
      await emitGovernanceTelemetry(
        env,
        buildTelemetryEvent("governance.proposal.denied", {
          proposalId: updated.proposal_id,
          beaconHash: updated.beacon_hash,
          codexHash: updated.codex_hash,
          environment: resolveRuntimeEnvironment(env),
          actionClass: updated.action_class,
          outcome: "denied",
          reasonCode: reason,
          correlationId: crypto.randomUUID(),
        }),
      );

      return jsonResponse({ ok: true, proposal: updated });
    } catch (error) {
      const message = error instanceof Error ? error.message : "proposal-deny-failed";
      return jsonResponse({ ok: false, error: message }, 400);
    }
  }

  if (pathname === "/api/governance/audit/events" && method === "GET") {
    const operator = await getAccessTokenOperator(request, env);
    if (!operator) {
      return jsonResponse({ ok: false, error: "Operator authentication required" }, 401);
    }

    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const cursorParam = url.searchParams.get("cursor");
    const limit = limitParam ? Number.parseInt(limitParam, 10) : 50;
    const cursor = cursorParam ? Number.parseInt(cursorParam, 10) : 0;
    const result = await listRecentAuditEvents(env, {
      limit: Number.isFinite(limit) ? limit : 50,
      cursor: Number.isFinite(cursor) ? cursor : 0,
    });
    return jsonResponse({ ok: true, ...result });
  }

  const bundleMatch = pathname.match(/^\/api\/governance\/audit\/bundle\/([^/]+)$/);
  if (bundleMatch && method === "GET") {
    const proposalId = bundleMatch[1];
    const proposal = await getProposal(env, proposalId);
    const receipt = proposal ? await findReceiptForProposal(env, proposalId) : null;
    const bundle = await buildEvidenceBundle(env, proposalId, proposal, receipt);
    return jsonResponse({ ok: true, bundle });
  }

  return null;
}

import { getAccessTokenOperator, type AuthEnv } from "./auth";
import { getCodexManifestSnapshot } from "./codex/manifestHash";
import { buildOperatorOsStatusSnapshot } from "./operatorStatus";
import { handleGovernanceProposalRoute, type GovernanceRouteEnv } from "./governanceRoutes";
import { buildEvidenceBundle, listAuditEventsForProposal } from "./governance/auditStore";
import {
  findReceiptForProposal,
  getApprovalReceipt,
  getProposal,
  updateProposalStatus,
} from "./governance/proposalStore";
import { validateActionClassPolicy } from "./governance/actionClassPolicy";
import { generateCouncilReview } from "./governance/councilReview";
import { getCouncilReview, saveCouncilReview } from "./governance/councilReviewStore";
import { getOperatorDecision, saveOperatorDecision } from "./governance/operatorDecisionStore";
import {
  getGovernanceSafeModeState,
  isContainmentAction,
  setGovernanceSafeModeState,
} from "./governance/governanceSafeMode";
import {
  buildTelemetryEvent,
  emitGovernanceTelemetry,
  listGovernanceTelemetry,
} from "./governance/governanceTelemetry";
import { createReceiptAuthorityClient } from "./governance/receiptAuthorityClient";
import { executeGovernedProposal } from "./governance/governedExecutor";
import { computeProposalActionDigest, resolveProposalActionType, resolveProposalMutationPayload } from "./governance/proposalActionDigest";
import { validateRollbackRequest } from "./governance/rollbackPolicy";
import {
  toActionProposalV1,
  toApprovalReceiptView,
  toExecutionReceiptView,
} from "./governance/phase2bContracts";
import { getExecutionReceipt } from "./governance/executionStore";
import { resolveRuntimeEnvironment } from "./governance/runtimeEnv";
import { resolveBeaconRuntimeState } from "./governance/beaconRuntime";
import type { GovernedExecutionEnv } from "./governance/governedMutation";
import type { ProposalStoreEnv } from "./governance/proposalStore";
import type { BuildInfoEnv } from "./buildInfo";
import type { ModeEnv } from "./mode";

export type OperatorGovernanceEnv = GovernanceRouteEnv &
  GovernedExecutionEnv &
  ProposalStoreEnv &
  AuthEnv &
  ModeEnv &
  BuildInfoEnv;

const MAX_BODY_BYTES = 48_768;

function jsonResponse(payload: unknown, status = 200, correlationId?: string): Response {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (correlationId) headers["x-correlation-id"] = correlationId;
  return Response.json(payload, { status, headers });
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) throw new Error("Payload too large");
  if (!raw.trim()) return {};
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON body must be an object");
  }
  return parsed as Record<string, unknown>;
}

async function requireOperator(request: Request, env: OperatorGovernanceEnv) {
  const operator = await getAccessTokenOperator(request, env);
  if (!operator) return null;
  return operator;
}

function governancePathFromOperator(pathname: string): string | null {
  if (pathname === "/api/operator/governance/proposals") return "/api/governance/proposals";
  const detail = pathname.match(/^\/api\/operator\/governance\/proposals\/([^/]+)$/);
  if (detail) return `/api/governance/proposals/${detail[1]}`;
  const approve = pathname.match(/^\/api\/operator\/governance\/proposals\/([^/]+)\/approve$/);
  if (approve) return `/api/governance/proposals/${approve[1]}/approve`;
  const deny = pathname.match(/^\/api\/operator\/governance\/proposals\/([^/]+)\/deny$/);
  if (deny) return `/api/governance/proposals/${deny[1]}/deny`;
  return null;
}

export async function handleOperatorGovernanceRoute(
  request: Request,
  pathname: string,
  method: string,
  env: OperatorGovernanceEnv,
): Promise<Response | null> {
  if (!pathname.startsWith("/api/operator/governance/")) return null;

  const correlationId = crypto.randomUUID();

  if (pathname === "/api/operator/governance/health" && method === "GET") {
    const operator = await requireOperator(request, env);
    if (!operator) {
      return jsonResponse({ ok: false, error: "Operator authentication required", code: "OPERATOR_AUTH_REQUIRED" }, 401, correlationId);
    }
    const [snapshot, safeMode, receiptHealth] = await Promise.all([
      buildOperatorOsStatusSnapshot(env),
      getGovernanceSafeModeState(env),
      createReceiptAuthorityClient(env).health(),
    ]);
    const telemetry = await listGovernanceTelemetry(env, { limit: 100 });
    const denialCount = telemetry.filter((event) => event.outcome === "denied" || event.name.includes("rejected")).length;
    return jsonResponse(
      {
        ok: true,
        correlationId,
        beacon: snapshot.beacon,
        codex: snapshot.codex,
        governance: snapshot.governance,
        safeMode,
        receiptAuthority: receiptHealth,
        pendingProposals: snapshot.approvals.pending,
        expiredProposals: snapshot.approvals.expired,
        recentDenialCount: denialCount,
      },
      200,
      correlationId,
    );
  }

  const mapped = governancePathFromOperator(pathname);
  if (mapped && (method === "GET" || method === "POST") && !pathname.includes("/review") && !pathname.includes("/execute") && !pathname.includes("/request-revision") && !pathname.includes("/rollback") && !pathname.includes("/audit")) {
    const operator = await requireOperator(request, env);
    if (!operator) {
      return jsonResponse({ ok: false, error: "Operator authentication required", code: "OPERATOR_AUTH_REQUIRED" }, 401, correlationId);
    }
    const url = new URL(request.url);
    url.pathname = mapped;
    const forwarded = new Request(url.toString(), request);
    const response = await handleGovernanceProposalRoute(forwarded, mapped, method, env);
    if (!response) return null;
    const body = (await response.json()) as Record<string, unknown>;
    return jsonResponse({ ...body, correlationId }, response.status, correlationId);
  }

  const proposalIdMatch = pathname.match(/^\/api\/operator\/governance\/proposals\/([^/]+)/);
  const proposalId = proposalIdMatch?.[1] ?? null;

  if (proposalId && pathname === `/api/operator/governance/proposals/${proposalId}` && method === "GET") {
    const operator = await requireOperator(request, env);
    if (!operator) {
      return jsonResponse({ ok: false, error: "Operator authentication required", code: "OPERATOR_AUTH_REQUIRED" }, 401, correlationId);
    }
    const proposal = await getProposal(env, proposalId);
    if (!proposal) return jsonResponse({ ok: false, error: "Proposal not found", code: "PROPOSAL_NOT_FOUND" }, 404, correlationId);
    const environment = resolveRuntimeEnvironment(env);
    const [review, decision, receipt, events] = await Promise.all([
      getCouncilReview(env, proposalId),
      getOperatorDecision(env, proposalId),
      findReceiptForProposal(env, proposalId),
      listAuditEventsForProposal(env, proposalId),
    ]);
    const view = await toActionProposalV1(proposal, environment);
    return jsonResponse(
      {
        ok: true,
        correlationId,
        proposal: view,
        councilReview: review,
        operatorDecision: decision,
        receipt: receipt ? toApprovalReceiptView(receipt) : null,
        auditEvents: events,
      },
      200,
      correlationId,
    );
  }

  if (proposalId && pathname === `/api/operator/governance/proposals/${proposalId}/review` && method === "POST") {
    const operator = await requireOperator(request, env);
    if (!operator) {
      return jsonResponse({ ok: false, error: "Operator authentication required", code: "OPERATOR_AUTH_REQUIRED" }, 401, correlationId);
    }
    const proposal = await getProposal(env, proposalId);
    if (!proposal) return jsonResponse({ ok: false, error: "Proposal not found", code: "PROPOSAL_NOT_FOUND" }, 404, correlationId);
    const body = await readJsonBody(request);
    const partial = body.partial === true;
    const startedAt = Date.now();
    await emitGovernanceTelemetry(
      env,
      buildTelemetryEvent("governance_review_requested", {
        proposalId,
        beaconHash: proposal.beacon_hash,
        codexHash: proposal.codex_hash,
        environment: resolveRuntimeEnvironment(env),
        actionClass: proposal.action_class,
        outcome: "observe",
        correlationId,
      }),
    );
    let review;
    try {
      review = generateCouncilReview(proposal, partial);
      await saveCouncilReview(env, review);
      await emitGovernanceTelemetry(
        env,
        buildTelemetryEvent("governance_review_completed", {
          proposalId,
          beaconHash: proposal.beacon_hash,
          codexHash: proposal.codex_hash,
          environment: resolveRuntimeEnvironment(env),
          actionClass: proposal.action_class,
          outcome: "pass",
          correlationId,
          reasonCode: review.recommendedDecision,
        }),
      );
    } catch {
      review = generateCouncilReview(proposal, true);
      await saveCouncilReview(env, review);
      await emitGovernanceTelemetry(
        env,
        buildTelemetryEvent("governance_review_failed", {
          proposalId,
          beaconHash: proposal.beacon_hash,
          codexHash: proposal.codex_hash,
          environment: resolveRuntimeEnvironment(env),
          actionClass: proposal.action_class,
          outcome: "fail",
          correlationId,
        }),
      );
    }
    return jsonResponse(
      { ok: true, correlationId, review, durationMs: Date.now() - startedAt, advisoryOnly: true },
      200,
      correlationId,
    );
  }

  if (proposalId && pathname === `/api/operator/governance/proposals/${proposalId}/request-revision` && method === "POST") {
    const operator = await requireOperator(request, env);
    if (!operator) {
      return jsonResponse({ ok: false, error: "Operator authentication required", code: "OPERATOR_AUTH_REQUIRED" }, 401, correlationId);
    }
    const body = await readJsonBody(request);
    const rationale = typeof body.rationale === "string" ? body.rationale.trim() : "revision requested";
    const proposal = await getProposal(env, proposalId);
    if (!proposal) return jsonResponse({ ok: false, error: "Proposal not found", code: "PROPOSAL_NOT_FOUND" }, 404, correlationId);
    const environment = resolveRuntimeEnvironment(env);
    const expectedDigest = await computeProposalActionDigest(proposal, environment);
    const codex = await getCodexManifestSnapshot();
    await saveOperatorDecision(env, {
      proposalId,
      decision: "request_revision",
      operatorId: operator.handle,
      decidedAt: new Date().toISOString(),
      constraints: [],
      rationale,
      expectedActionDigest: expectedDigest,
      beaconHash: proposal.beacon_hash,
      codexHash: codex.manifestHash,
    });
    const updated = await updateProposalStatus(env, proposalId, "draft", {
      revision: proposal.revision + 1,
      denial_reason: rationale,
    });
    await emitGovernanceTelemetry(
      env,
      buildTelemetryEvent("governance_revision_requested", {
        proposalId,
        beaconHash: proposal.beacon_hash,
        codexHash: codex.manifestHash,
        environment,
        actionClass: proposal.action_class,
        outcome: "observe",
        correlationId,
        reasonCode: rationale,
      }),
    );
    return jsonResponse({ ok: true, correlationId, proposal: updated }, 200, correlationId);
  }

  if (proposalId && (pathname.endsWith("/approve") || pathname.endsWith("/deny")) && method === "POST") {
    const operator = await requireOperator(request, env);
    if (!operator) {
      return jsonResponse({ ok: false, error: "Operator authentication required", code: "OPERATOR_AUTH_REQUIRED" }, 401, correlationId);
    }
    const body = await readJsonBody(request);
    const rationale = typeof body.rationale === "string" ? body.rationale.trim() : undefined;
    const constraints = Array.isArray(body.constraints)
      ? body.constraints.filter((entry): entry is string => typeof entry === "string")
      : [];
    const proposal = await getProposal(env, proposalId);
    if (!proposal) return jsonResponse({ ok: false, error: "Proposal not found", code: "PROPOSAL_NOT_FOUND" }, 404, correlationId);

    const actionType = resolveProposalActionType(proposal);
    const safeMode = await getGovernanceSafeModeState(env);
    const policy = validateActionClassPolicy(proposal, {
      actionType,
      rationale,
      safeModeActive: safeMode.active,
      isContainmentAction: isContainmentAction(actionType),
    });
    if (!policy.allowed) {
      return jsonResponse({ ok: false, error: policy.reason, code: policy.code, safeMode: safeMode.active, correlationId }, 403, correlationId);
    }

    const environment = resolveRuntimeEnvironment(env);
    const expectedDigest = await computeProposalActionDigest(proposal, environment, {
      actionType: typeof body.actionType === "string" ? body.actionType : undefined,
      mutationPayload:
        body.mutationPayload && typeof body.mutationPayload === "object" && !Array.isArray(body.mutationPayload)
          ? (body.mutationPayload as Record<string, unknown>)
          : undefined,
    });
    const codex = await getCodexManifestSnapshot();

    if (pathname.endsWith("/deny")) {
      const mappedPath = `/api/governance/proposals/${proposalId}/deny`;
      const url = new URL(request.url);
      url.pathname = mappedPath;
      const forwarded = new Request(url.toString(), {
        method: "POST",
        headers: request.headers,
        body: JSON.stringify({ reason: rationale ?? "denied by operator" }),
      });
      const response = await handleGovernanceProposalRoute(forwarded, mappedPath, "POST", env);
      if (!response) return null;
      const payload = (await response.json()) as Record<string, unknown>;
      await saveOperatorDecision(env, {
        proposalId,
        decision: "deny",
        operatorId: operator.handle,
        decidedAt: new Date().toISOString(),
        constraints,
        rationale,
        expectedActionDigest: expectedDigest,
        beaconHash: proposal.beacon_hash,
        codexHash: codex.manifestHash,
      });
      await emitGovernanceTelemetry(
        env,
        buildTelemetryEvent("governance_operator_denied", {
          proposalId,
          beaconHash: proposal.beacon_hash,
          codexHash: codex.manifestHash,
          environment,
          actionClass: proposal.action_class,
          outcome: "deny",
          correlationId,
        }),
      );
      return jsonResponse({ ...payload, correlationId }, response.status, correlationId);
    }

    const mappedPath = `/api/governance/proposals/${proposalId}/approve`;
    const url = new URL(request.url);
    url.pathname = mappedPath;
    const forwarded = new Request(url.toString(), {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({
        actionType: body.actionType,
        mutationPayload: body.mutationPayload,
      }),
    });
    const response = await handleGovernanceProposalRoute(forwarded, mappedPath, "POST", env);
    if (!response) return null;
    const payload = (await response.json()) as Record<string, unknown>;
    if (response.ok) {
      await saveOperatorDecision(env, {
        proposalId,
        decision: "approve",
        operatorId: operator.handle,
        decidedAt: new Date().toISOString(),
        constraints,
        rationale,
        expectedActionDigest: expectedDigest,
        beaconHash: proposal.beacon_hash,
        codexHash: codex.manifestHash,
      });
      await emitGovernanceTelemetry(
        env,
        buildTelemetryEvent("governance_operator_approved", {
          proposalId,
          approvalId: (payload.receipt as { approvalId?: string } | undefined)?.approvalId,
          beaconHash: proposal.beacon_hash,
          codexHash: codex.manifestHash,
          environment,
          actionClass: proposal.action_class,
          outcome: "pass",
          correlationId,
        }),
      );
    }
    return jsonResponse({ ...payload, correlationId, constraints }, response.status, correlationId);
  }

  if (proposalId && pathname === `/api/operator/governance/proposals/${proposalId}/execute` && method === "POST") {
    const operator = await requireOperator(request, env);
    if (!operator) {
      return jsonResponse({ ok: false, error: "Operator authentication required", code: "OPERATOR_AUTH_REQUIRED" }, 401, correlationId);
    }
    const body = await readJsonBody(request);
    const idempotencyKey =
      typeof body.idempotencyKey === "string" && body.idempotencyKey.trim()
        ? body.idempotencyKey.trim()
        : crypto.randomUUID();
    const proposal = await getProposal(env, proposalId);
    if (!proposal) return jsonResponse({ ok: false, error: "Proposal not found", code: "PROPOSAL_NOT_FOUND" }, 404, correlationId);
    if (proposal.status !== "approved" && proposal.status !== "executed") {
      return jsonResponse({ ok: false, error: "Proposal not approved", code: "PROPOSAL_NOT_APPROVED" }, 403, correlationId);
    }
    const approvalId = proposal.approval_id;
    if (!approvalId) {
      return jsonResponse({ ok: false, error: "Approval receipt missing", code: "RECEIPT_NOT_FOUND" }, 403, correlationId);
    }

    const actionType = resolveProposalActionType(proposal);
    const safeMode = await getGovernanceSafeModeState(env);
    const policy = validateActionClassPolicy(proposal, {
      actionType,
      safeModeActive: safeMode.active,
      isContainmentAction: isContainmentAction(actionType),
    });
    if (!policy.allowed) {
      return jsonResponse(
        { ok: false, error: policy.reason, code: policy.code, safeMode: safeMode.active, proposalId, correlationId },
        403,
        correlationId,
      );
    }

    const mutationPayload =
      body.mutationPayload && typeof body.mutationPayload === "object" && !Array.isArray(body.mutationPayload)
        ? (body.mutationPayload as Record<string, unknown>)
        : undefined;

    const result = await executeGovernedProposal(env, {
      proposal,
      approvalId,
      idempotencyKey,
      mutationPayload,
      environment: resolveRuntimeEnvironment(env),
    });

    if (!result.ok) {
      return jsonResponse(
        { ok: false, error: result.error, code: result.code, correlationId },
        403,
        correlationId,
      );
    }

    return jsonResponse(
      {
        ok: true,
        correlationId,
        result: result.result,
        executionReceipt: result.executionReceipt ? toExecutionReceiptView(result.executionReceipt) : null,
      },
      200,
      correlationId,
    );
  }

  if (proposalId && pathname === `/api/operator/governance/proposals/${proposalId}/rollback` && method === "POST") {
    const operator = await requireOperator(request, env);
    if (!operator) {
      return jsonResponse({ ok: false, error: "Operator authentication required", code: "OPERATOR_AUTH_REQUIRED" }, 401, correlationId);
    }
    const body = await readJsonBody(request);
    const rollbackProposalId =
      typeof body.rollbackProposalId === "string" ? body.rollbackProposalId.trim() : "";
    if (!rollbackProposalId) {
      return jsonResponse(
        { ok: false, error: "rollbackProposalId required", code: "ROLLBACK_PROPOSAL_REQUIRED", correlationId },
        400,
        correlationId,
      );
    }
    const idempotencyKey =
      typeof body.idempotencyKey === "string" && body.idempotencyKey.trim()
        ? body.idempotencyKey.trim()
        : crypto.randomUUID();

    const sourceProposal = await getProposal(env, proposalId);
    if (!sourceProposal) {
      return jsonResponse({ ok: false, error: "Proposal not found", code: "PROPOSAL_NOT_FOUND" }, 404, correlationId);
    }

    const rollbackProposal = await getProposal(env, rollbackProposalId);
    if (!rollbackProposal) {
      return jsonResponse(
        { ok: false, error: "Rollback proposal not found", code: "ROLLBACK_PROPOSAL_REQUIRED", correlationId },
        404,
        correlationId,
      );
    }

    const rollbackValidation = validateRollbackRequest({ sourceProposal, rollbackProposal });
    if (!rollbackValidation.allowed) {
      return jsonResponse(
        { ok: false, error: rollbackValidation.reason, code: rollbackValidation.code, correlationId },
        403,
        correlationId,
      );
    }

    const rollbackActionType = resolveProposalActionType(rollbackProposal);
    const safeMode = await getGovernanceSafeModeState(env);
    const policy = validateActionClassPolicy(rollbackProposal, {
      actionType: rollbackActionType,
      safeModeActive: safeMode.active,
      isContainmentAction: isContainmentAction(rollbackActionType),
    });
    if (!policy.allowed) {
      return jsonResponse(
        { ok: false, error: policy.reason, code: policy.code, safeMode: safeMode.active, proposalId, correlationId },
        403,
        correlationId,
      );
    }

    const environment = resolveRuntimeEnvironment(env);
    const codex = await getCodexManifestSnapshot();
    const beacon = await resolveBeaconRuntimeState(env);
    const expectedDigest = await computeProposalActionDigest(rollbackProposal, environment);
    const bodyDigest = await computeProposalActionDigest(rollbackProposal, environment, {
      actionType: typeof body.actionType === "string" ? body.actionType : undefined,
      mutationPayload:
        body.mutationPayload && typeof body.mutationPayload === "object" && !Array.isArray(body.mutationPayload)
          ? (body.mutationPayload as Record<string, unknown>)
          : undefined,
    });
    if (bodyDigest !== expectedDigest) {
      return jsonResponse(
        { ok: false, error: "Rollback action digest mismatch", code: "ROLLBACK_DIGEST_MISMATCH", correlationId },
        403,
        correlationId,
      );
    }

    const rollbackApprovalId = rollbackProposal.approval_id;
    if (!rollbackApprovalId) {
      return jsonResponse(
        { ok: false, error: "Rollback approval receipt missing", code: "ROLLBACK_RECEIPT_REQUIRED", correlationId },
        403,
        correlationId,
      );
    }

    await emitGovernanceTelemetry(
      env,
      buildTelemetryEvent("governance_rollback_started", {
        proposalId,
        approvalId: rollbackApprovalId,
        beaconHash: beacon.hash ?? sourceProposal.beacon_hash,
        codexHash: codex.manifestHash,
        environment,
        actionClass: rollbackProposal.action_class,
        outcome: "observe",
        correlationId,
        reasonCode: rollbackProposalId,
      }),
    );

    const mutationPayload =
      body.mutationPayload && typeof body.mutationPayload === "object" && !Array.isArray(body.mutationPayload)
        ? (body.mutationPayload as Record<string, unknown>)
        : resolveProposalMutationPayload(rollbackProposal);

    const result = await executeGovernedProposal(env, {
      proposal: rollbackProposal,
      approvalId: rollbackApprovalId,
      idempotencyKey,
      mutationPayload,
      environment,
    });

    if (!result.ok) {
      await emitGovernanceTelemetry(
        env,
        buildTelemetryEvent("governance_rollback_completed", {
          proposalId,
          approvalId: rollbackApprovalId,
          executionId: result.executionReceipt?.executionId,
          beaconHash: beacon.hash ?? "unknown",
          codexHash: codex.manifestHash,
          environment,
          actionClass: rollbackProposal.action_class,
          outcome: "fail",
          correlationId,
          reasonCode: result.code ?? "ROLLBACK_EXECUTION_FAILED",
        }),
      );
      return jsonResponse(
        { ok: false, error: result.error, code: result.code ?? "ROLLBACK_EXECUTION_FAILED", correlationId },
        403,
        correlationId,
      );
    }

    await updateProposalStatus(env, proposalId, "rolled_back");
    await emitGovernanceTelemetry(
      env,
      buildTelemetryEvent("governance_rollback_completed", {
        proposalId,
        approvalId: rollbackApprovalId,
        executionId: result.executionReceipt?.executionId,
        beaconHash: beacon.hash ?? "unknown",
        codexHash: codex.manifestHash,
        environment,
        actionClass: rollbackProposal.action_class,
        outcome: "pass",
        correlationId,
      }),
    );

    return jsonResponse(
      {
        ok: true,
        correlationId,
        sourceProposalId: proposalId,
        rollbackProposalId,
        result: result.result,
        executionReceipt: result.executionReceipt ? toExecutionReceiptView(result.executionReceipt) : null,
      },
      200,
      correlationId,
    );
  }

  if (proposalId && pathname === `/api/operator/governance/proposals/${proposalId}/audit` && method === "GET") {
    const operator = await requireOperator(request, env);
    if (!operator) {
      return jsonResponse({ ok: false, error: "Operator authentication required", code: "OPERATOR_AUTH_REQUIRED" }, 401, correlationId);
    }
    const proposal = await getProposal(env, proposalId);
    const receipt = proposal ? await findReceiptForProposal(env, proposalId) : null;
    const bundle = await buildEvidenceBundle(env, proposalId, proposal, receipt);
    const events = await listAuditEventsForProposal(env, proposalId);
    let execution = null;
    if (receipt) {
      const executions = await listGovernanceTelemetry(env, { limit: 200 });
      const match = executions.find((event) => event.approvalId === receipt.approvalId && event.executionId);
      if (match?.executionId) {
        const execReceipt = await getExecutionReceipt(env, match.executionId);
        if (execReceipt) execution = toExecutionReceiptView(execReceipt);
      }
    }
    return jsonResponse(
      { ok: true, correlationId, bundle, events, execution, proposalId, approvalId: receipt?.approvalId ?? null },
      200,
      correlationId,
    );
  }

  if (pathname === "/api/operator/governance/receipts" && method === "GET") {
    const operator = await requireOperator(request, env);
    if (!operator) {
      return jsonResponse({ ok: false, error: "Operator authentication required", code: "OPERATOR_AUTH_REQUIRED" }, 401, correlationId);
    }
    const url = new URL(request.url);
    const receiptId = url.searchParams.get("receiptId") ?? url.searchParams.get("id");
    if (!receiptId) {
      return jsonResponse({ ok: false, error: "receiptId query parameter required", code: "RECEIPT_ID_REQUIRED" }, 400, correlationId);
    }
    const receipt = await getApprovalReceipt(env, receiptId);
    if (!receipt) return jsonResponse({ ok: false, error: "Receipt not found", code: "RECEIPT_NOT_FOUND" }, 404, correlationId);
    return jsonResponse({ ok: true, correlationId, receipt: toApprovalReceiptView(receipt) }, 200, correlationId);
  }

  const receiptMatch = pathname.match(/^\/api\/operator\/governance\/receipts\/([^/]+)$/);
  if (receiptMatch && method === "GET") {
    const operator = await requireOperator(request, env);
    if (!operator) {
      return jsonResponse({ ok: false, error: "Operator authentication required", code: "OPERATOR_AUTH_REQUIRED" }, 401, correlationId);
    }
    const receipt = await getApprovalReceipt(env, receiptMatch[1]);
    if (!receipt) return jsonResponse({ ok: false, error: "Receipt not found", code: "RECEIPT_NOT_FOUND" }, 404, correlationId);
    return jsonResponse({ ok: true, correlationId, receipt: toApprovalReceiptView(receipt) }, 200, correlationId);
  }

  if (pathname === "/api/operator/governance/safe-mode" && method === "GET") {
    const operator = await requireOperator(request, env);
    if (!operator) {
      return jsonResponse({ ok: false, error: "Operator authentication required", code: "OPERATOR_AUTH_REQUIRED" }, 401, correlationId);
    }
    const safeMode = await getGovernanceSafeModeState(env);
    return jsonResponse({ ok: true, correlationId, safeMode }, 200, correlationId);
  }

  if (pathname === "/api/operator/governance/safe-mode/enter" && method === "POST") {
    const operator = await requireOperator(request, env);
    if (!operator) {
      return jsonResponse({ ok: false, error: "Operator authentication required", code: "OPERATOR_AUTH_REQUIRED" }, 401, correlationId);
    }
    const body = await readJsonBody(request);
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!reason) return jsonResponse({ ok: false, error: "reason required", code: "REASON_REQUIRED" }, 400, correlationId);
    const state = {
      active: true,
      reason,
      activatedBy: operator.handle,
      activatedAt: new Date().toISOString(),
    };
    await setGovernanceSafeModeState(env, state);
    const codex = await getCodexManifestSnapshot();
    const beacon = await resolveBeaconRuntimeState(env);
    await emitGovernanceTelemetry(
      env,
      buildTelemetryEvent("governance_safe_mode_entered", {
        beaconHash: beacon.hash ?? "unknown",
        codexHash: codex.manifestHash,
        environment: resolveRuntimeEnvironment(env),
        actionClass: "C5",
        outcome: "pass",
        correlationId,
        reasonCode: reason,
      }),
    );
    return jsonResponse({ ok: true, correlationId, safeMode: state }, 200, correlationId);
  }

  if (pathname === "/api/operator/governance/safe-mode/exit" && method === "POST") {
    const operator = await requireOperator(request, env);
    if (!operator) {
      return jsonResponse({ ok: false, error: "Operator authentication required", code: "OPERATOR_AUTH_REQUIRED" }, 401, correlationId);
    }
    const body = await readJsonBody(request);
    const reason = typeof body.reason === "string" ? body.reason.trim() : "safe mode cleared";
    const state = {
      active: false,
      reason,
      activatedBy: operator.handle,
      activatedAt: new Date().toISOString(),
    };
    await setGovernanceSafeModeState(env, state);
    const codex = await getCodexManifestSnapshot();
    const beacon = await resolveBeaconRuntimeState(env);
    await emitGovernanceTelemetry(
      env,
      buildTelemetryEvent("governance_safe_mode_exited", {
        beaconHash: beacon.hash ?? "unknown",
        codexHash: codex.manifestHash,
        environment: resolveRuntimeEnvironment(env),
        actionClass: "C5",
        outcome: "pass",
        correlationId,
        reasonCode: reason,
      }),
    );
    return jsonResponse({ ok: true, correlationId, safeMode: state }, 200, correlationId);
  }

  if (pathname === "/api/operator/governance/telemetry" && method === "GET") {
    const operator = await requireOperator(request, env);
    if (!operator) {
      return jsonResponse({ ok: false, error: "Operator authentication required", code: "OPERATOR_AUTH_REQUIRED" }, 401, correlationId);
    }
    const url = new URL(request.url);
    const limit = Number.parseInt(url.searchParams.get("limit") ?? "50", 10);
    const events = await listGovernanceTelemetry(env, { limit: Number.isFinite(limit) ? limit : 50 });
    return jsonResponse({ ok: true, correlationId, events }, 200, correlationId);
  }

  return jsonResponse({ ok: false, error: "Unknown governance route", code: "ROUTE_NOT_FOUND" }, 404, correlationId);
}

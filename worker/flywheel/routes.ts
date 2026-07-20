import type { FlywheelCommand, FlywheelRun, FlywheelRunDetail } from "../../shared/flywheel/contracts";
import { isRecord, validateFlywheelApproval, validateRunCreate } from "../../shared/flywheel/contracts";
import { FLYWHEEL_STAGE_REGISTRY } from "../../shared/flywheel/stages";
import { getAccessTokenOperator } from "../auth";
import {
  buildReceiptFromProposal,
  computeProposalActionDigest,
  finalizeApprovalReceipt,
  getBeaconHashForReads,
  getProposal,
  resolveBeaconRuntimeState,
  resolveExecutionSigning,
  resolveRuntimeEnvironment,
  runGovernedMutation,
  saveApprovalReceipt,
  saveProposal,
  updateProposalStatus,
} from "./mainCompat";
import { parseFlywheelCommand } from "./commandParser";
import { buildFlywheelProposal, evaluateFlywheelGovernance } from "./governance";
import type { FlywheelDO } from "./do";

export type FlywheelRouteEnv = Env & {
  FLYWHEEL: DurableObjectNamespace<FlywheelDO>;
  GOVERNANCE_RECEIPT_SIGNING_KEY?: string;
  AUTH_SIGNING_KEY?: string;
  BEACON_SIGNING_KEY?: string;
};

function meta(traceId = crypto.randomUUID()) { return { traceId, timestamp: new Date().toISOString(), version: "1.0" as const }; }
function success<T>(data: T, status = 200, traceId?: string): Response { return Response.json({ ok: true, data, meta: meta(traceId) }, { status }); }
function failure(code: string, message: string, status: number, retryable = false, traceId?: string, details: Record<string, unknown> = {}): Response { return Response.json({ ok: false, error: { code, message, retryable, details }, meta: meta(traceId) }, { status }); }
async function readBody(request: Request): Promise<Record<string, unknown>> { try { const value = await request.json(); return isRecord(value) ? value : {}; } catch { return {}; } }
function configuredTenant(env: FlywheelRouteEnv): string | null { return env.FLYWHEEL_TENANT_ID?.trim() || null; }
function tenantAllowed(body: Record<string, unknown>, tenantId: string): boolean { return body.tenantId === undefined || body.tenantId === tenantId; }
async function callDo(env: FlywheelRouteEnv, tenantId: string, path: string, method = "GET", body?: Record<string, unknown>): Promise<Response> {
  const stub = env.FLYWHEEL.getByName(tenantId);
  return stub.fetch(new Request(`https://flywheel.internal${path}`, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }));
}
async function unwrap<T>(response: Response): Promise<{ ok: true; value: T } | { ok: false; response: Response }> {
  const value = await response.json() as unknown;
  if (!response.ok) { const body = isRecord(value) ? value : {}; return { ok: false, response: failure(typeof body.code === "string" ? body.code : "FLYWHEEL_STORAGE_ERROR", "Flywheel storage operation failed.", response.status, response.status >= 500, undefined, body) }; }
  return { ok: true, value: value as T };
}

async function submitCommand(request: Request, env: FlywheelRouteEnv, tenantId: string, runId: string, overrideRaw?: string): Promise<Response> {
  const body = await readBody(request);
  if (!tenantAllowed(body, tenantId)) return failure("GOVERNANCE_TENANT_MISMATCH", "Tenant scope is not authorized.", 403);
  const parsed = parseFlywheelCommand(overrideRaw ?? body.command);
  if (!parsed.ok) return failure(parsed.code, parsed.message, 400);
  if (parsed.command.category === "DEPLOY") return failure("PRODUCTION_DEPLOY_NOT_AUTHORIZED", "Deployment commands are disabled in Flywheel v1.", 403);
  const detailResult = await unwrap<FlywheelRunDetail>(await callDo(env, tenantId, `/runs/${encodeURIComponent(runId)}`));
  if (!detailResult.ok) return detailResult.response;
  const operator = await getAccessTokenOperator(request, env);
  const traceId = typeof body.traceId === "string" ? body.traceId : crypto.randomUUID();
  const payload = isRecord(body.payload) ? { ...body.payload } : {};
  const materialStageCommand = parsed.command.target.startsWith("STAGE_") && Number(parsed.command.actionClass.slice(1)) >= 2;
  if (materialStageCommand && detailResult.value.evidence.length === 0) return failure("GOVERNANCE_EVIDENCE_MISSING", "A material stage transition requires persisted evidence from bounded analysis.", 409, false, traceId);
  if (materialStageCommand && !Array.isArray(payload.evidenceRefs)) payload.evidenceRefs = detailResult.value.evidence.slice(-20).map((item) => item.artifactRef);
  const command: FlywheelCommand = {
    ...parsed.command,
    commandId: typeof body.commandId === "string" ? body.commandId : crypto.randomUUID(),
    payload,
    requestedBy: operator?.handle ?? "authenticated-operator",
    missionId: detailResult.value.run.missionId,
    traceId,
    idempotencyKey: typeof body.idempotencyKey === "string" && body.idempotencyKey ? body.idempotencyKey : crypto.randomUUID(),
    requestedAt: new Date().toISOString(),
  };
  const decision = await evaluateFlywheelGovernance(env, tenantId, detailResult.value.run, command);
  if (!decision.allowed) return failure(decision.code ?? "GOVERNANCE_DENIED", decision.reason, 409, false, traceId);
  let proposalId: string | undefined;
  if (decision.approvalRequired) {
    const beacon = await resolveBeaconRuntimeState(env);
    if (!beacon.hash) return failure("GOVERNANCE_MISSING_BEACON", "Beacon hash is unavailable.", 503, false, traceId);
    const proposal = await buildFlywheelProposal(detailResult.value.run, command, beacon.hash);
    await saveProposal(env, proposal);
    proposalId = proposal.proposal_id;
  }
  const stored = await unwrap<Record<string, unknown>>(await callDo(env, tenantId, "/commands", "POST", { runId, command, approvalRequired: decision.approvalRequired, proposalId }));
  if (!stored.ok) return stored.response;
  return success(stored.value, decision.approvalRequired ? 202 : 200, traceId);
}

export async function handleFlywheelRoute(request: Request, pathname: string, env: FlywheelRouteEnv): Promise<Response | null> {
  if (pathname !== "/api/flywheel" && !pathname.startsWith("/api/flywheel/")) return null;
  const tenantId = configuredTenant(env);
  if (!tenantId) return failure("FLYWHEEL_TENANT_NOT_CONFIGURED", "Flywheel tenant configuration is required.", 503);
  const authenticatedOperator = await getAccessTokenOperator(request, env);
  if (!authenticatedOperator) return failure("OPERATOR_AUTH_REQUIRED", "Authenticated Operator authority is required.", 401);
  if (pathname === "/api/flywheel/stages" && request.method === "GET") return success({ stages: FLYWHEEL_STAGE_REGISTRY });
  if (pathname === "/api/flywheel" && request.method === "GET") {
    const result = await unwrap<{ runs: FlywheelRun[] }>(await callDo(env, tenantId, "/runs"));
    return result.ok ? success(result.value) : result.response;
  }
  if (pathname === "/api/flywheel/runs" && request.method === "POST") {
    const body = await readBody(request); const validation = validateRunCreate(body);
    if (!validation.valid) return failure("SCHEMA_MISMATCH", "Run request is invalid.", 400, false, undefined, { errors: validation.errors });
    if (!tenantAllowed(body, tenantId)) return failure("GOVERNANCE_TENANT_MISMATCH", "Tenant scope is not authorized.", 403);
    const beaconHash = await getBeaconHashForReads(env);
    if (!/^[a-f0-9]{64}$/.test(beaconHash)) return failure("GOVERNANCE_HASH_INVALID", "Beacon SHA256 is invalid.", 503);
    const beacon = await resolveBeaconRuntimeState(env);
    const now = new Date().toISOString(); const traceId = crypto.randomUUID();
    const run: FlywheelRun = { id: crypto.randomUUID(), missionId: String(body.missionId), tenantId, currentStage: "lead_generation", state: "queued", autonomyLevel: body.autonomyLevel === 0 ? 0 : 1, riskLevel: "low", beaconVersion: beacon.status === "verified_v2" ? beacon.version : "legacy-v1", beaconSha256: beaconHash, createdAt: now, updatedAt: now, traceId, idempotencyKey: String(body.idempotencyKey) };
    const result = await unwrap<{ run: FlywheelRun; replay: boolean }>(await callDo(env, tenantId, "/runs", "POST", { tenantId, idempotencyKey: run.idempotencyKey, run }));
    return result.ok ? success(result.value, result.value.replay ? 200 : 201, traceId) : result.response;
  }
  const eventsMatch = pathname.match(/^\/api\/flywheel\/runs\/([^/]+)\/events$/);
  if (eventsMatch && request.method === "GET") { const result = await unwrap<Record<string, unknown>>(await callDo(env, tenantId, `/runs/${eventsMatch[1]}/events`)); return result.ok ? success(result.value) : result.response; }
  const commandMatch = pathname.match(/^\/api\/flywheel\/runs\/([^/]+)\/commands$/);
  if (commandMatch && request.method === "POST") return submitCommand(request, env, tenantId, commandMatch[1]);
  const approveMatch = pathname.match(/^\/api\/flywheel\/runs\/([^/]+)\/approve$/);
  if (approveMatch && request.method === "POST") {
    const operator = authenticatedOperator;
    const body = await readBody(request); const approvalValidation = validateFlywheelApproval(body);
    if (!approvalValidation.valid) return failure("SCHEMA_MISMATCH", "commandId and proposalId are required.", 400, false, undefined, { errors: approvalValidation.errors });
    const { commandId, proposalId } = approvalValidation.value;
    const reserved = await unwrap<{ runId: string; proposalId?: string; command: FlywheelCommand }>(await callDo(env, tenantId, `/commands/${encodeURIComponent(commandId)}`));
    if (!reserved.ok) return reserved.response;
    if (reserved.value.runId !== approveMatch[1] || reserved.value.proposalId !== proposalId) return failure("GOVERNANCE_SCOPE_MISMATCH", "Approval does not match the reserved command.", 409);
    const proposal = await getProposal(env, proposalId); if (!proposal) return failure("PROPOSAL_NOT_FOUND", "Governance proposal was not found.", 404);
    const signing = resolveExecutionSigning(env); if (!signing) return failure("GOVERNANCE_SIGNING_UNAVAILABLE", "Governance receipt signing is unavailable.", 503);
    const environment = resolveRuntimeEnvironment(env); const actionType = "flywheel.command"; const mutationPayload = proposal.action_payload ?? {};
    const actionDigest = await computeProposalActionDigest(proposal, environment, { actionType, mutationPayload });
    const approvalId = crypto.randomUUID(); const approvedAt = new Date().toISOString();
    const receipt = await finalizeApprovalReceipt(buildReceiptFromProposal(proposal, { approvalId, actionDigest, approvedBy: operator.handle, approvedAt, expiresAt: proposal.expiration, nonce: crypto.randomUUID(), targetEnvironment: environment }), signing);
    await saveApprovalReceipt(env, receipt); await updateProposalStatus(env, proposalId, "approved", { approval_id: approvalId });
    const governed = await runGovernedMutation<Record<string, unknown>, Record<string, unknown>>(env, {
      actionType,
      actionClass: reserved.value.command.actionClass,
      environment,
      proposalId,
      approvalId,
      actionDigest,
      idempotencyKey: `flywheel:${tenantId}:${commandId}`,
      input: mutationPayload,
      rollbackReference: `flywheel:${tenantId}:${approveMatch[1]}:pre-command`,
      execute: async () => {
        const response = await callDo(env, tenantId, "/approve", "POST", { runId: approveMatch[1], commandId, proposalId, approvalId });
        const value = await response.json() as Record<string, unknown>;
        if (!response.ok || value.ok === false) throw new Error(typeof value.code === "string" ? value.code : "FLYWHEEL_EXECUTION_FAILED");
        return value;
      },
    });
    if (!governed.ok) return failure(governed.code ?? "GOVERNANCE_EXECUTION_FAILED", governed.error ?? "Governed Flywheel execution failed.", 409);
    return success({ ...(governed.result ?? {}), executionReceipt: governed.executionReceipt, receipt: { receiptId: approvalId, proposalId, commandId, approvedBy: operator.handle, approvedAt, expiresAt: receipt.expiresAt, beaconSha256: receipt.beaconHash } });
  }
  const interventionMatch = pathname.match(/^\/api\/flywheel\/runs\/([^/]+)\/(pause|resume|safe-mode|terminate)$/);
  if (interventionMatch && request.method === "POST") {
    const [, runId, action] = interventionMatch;
    if (action === "safe-mode") { const body = await readBody(request); const result = await unwrap<Record<string, unknown>>(await callDo(env, tenantId, "/safe-mode", "POST", { runId, traceId: crypto.randomUUID(), actorId: "authenticated-operator", reason: typeof body.reason === "string" ? body.reason : "operator_intervention" })); return result.ok ? success(result.value) : result.response; }
    const raw = action === "pause" ? "PAUSE::FLYWHEEL::EXECUTION" : action === "resume" ? "RESUME::FLYWHEEL::EXECUTION" : "TERMINATE::FLYWHEEL::MISSION";
    return submitCommand(request, env, tenantId, runId, raw);
  }
  const detailMatch = pathname.match(/^\/api\/flywheel\/runs\/([^/]+)$/);
  if (detailMatch && request.method === "GET") { const result = await unwrap<FlywheelRunDetail>(await callDo(env, tenantId, `/runs/${detailMatch[1]}`)); return result.ok ? success(result.value) : result.response; }
  return failure("FLYWHEEL_ROUTE_NOT_FOUND", "Flywheel route was not found.", 404);
}

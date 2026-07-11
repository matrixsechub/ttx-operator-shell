import type { AiGatewayEnv } from "./aiGateway";
import type { BackboneEnv } from "./backboneEnv";
import type { GhostEnv } from "./ghost";
import type { TelemetryEnv } from "./telemetry";
import { generateTriageItemsFromAudit } from "./data/prismTriageEngine";
import { generatePatchProposal, maybeEnrichPatchProposal } from "./data/prismPatchProposal";
import {
  buildPrismTriageTelemetry,
  emitPrismTriageTelemetry,
  hashAuditId,
} from "./data/prismTriageTelemetry";
import type { PrismTriageDispositionStatus } from "./data/prismTriageTypes";
import {
  assertPrismPatchProposalInvariants,
  assertPrismTriageInvariants,
  isPrismTriageDispositionStatus,
} from "./data/prismTriageTypes";
import { readUiUxAudit, type PrismUiuxStorageEnv } from "./prismUiuxStorage";
import { recordPrismTriageAuditEvent } from "./prismTriageAudit";
import {
  assertSourceAuditUnchanged,
  getNextProposalRevision,
  listProposalSummaries,
  listProposalsForTriage,
  listTriageItemsForAudit,
  listTriageSummaries,
  loadExistingTriageMap,
  PrismTriageStorageError,
  readPatchProposal,
  readTriageItem,
  savePatchProposal,
  saveTriageItem,
  validateDispositionTransition,
  type PrismTriageStorageEnv,
} from "./prismTriageStorage";

export type PrismTriageRouteEnv = PrismTriageStorageEnv & PrismUiuxStorageEnv & BackboneEnv & AiGatewayEnv & GhostEnv & TelemetryEnv;

const MAX_BODY_BYTES = 16_384;

const FORBIDDEN_EXECUTION_KEYS = [
  "mutationAuthorized",
  "execute",
  "deploy",
  "commit",
  "push",
  "approvePatch",
] as const;

function jsonResponse(payload: unknown, status = 200): Response {
  return Response.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export class PrismTriageValidationError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new PrismTriageValidationError(400, "Content-Type must be application/json");
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    throw new PrismTriageValidationError(400, "Payload too large");
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new PrismTriageValidationError(400, "JSON body must be an object");
  }
  return parsed as Record<string, unknown>;
}

export function rejectExecutionFields(body: Record<string, unknown>): void {
  for (const key of FORBIDDEN_EXECUTION_KEYS) {
    if (key in body && body[key] === true) {
      throw new PrismTriageValidationError(400, `Field ${key}=true is not permitted in Phase 2D`);
    }
  }
}

function parseAuditIdFromGenerateBody(body: Record<string, unknown>): string {
  rejectExecutionFields(body);
  const auditId = body.auditId;
  if (typeof auditId !== "string" || !auditId.trim()) {
    throw new PrismTriageValidationError(400, "auditId is required");
  }
  return auditId.trim();
}

function parseDispositionBody(body: Record<string, unknown>): { status: PrismTriageDispositionStatus; reason: string } {
  rejectExecutionFields(body);
  const status = body.status;
  const reason = body.reason;
  if (typeof status !== "string" || !isPrismTriageDispositionStatus(status)) {
    throw new PrismTriageValidationError(
      400,
      "status must be accepted_for_planning, deferred, or dismissed",
    );
  }
  if (typeof reason !== "string" || !reason.trim()) {
    throw new PrismTriageValidationError(400, "reason is required");
  }
  return { status, reason: reason.trim().slice(0, 2000) };
}

async function handleListTriage(env: PrismTriageRouteEnv): Promise<Response> {
  const items = await listTriageSummaries(env);
  await emitPrismTriageTelemetry(
    env,
    buildPrismTriageTelemetry("prism_triage_queue_viewed", {
      routeCount: items.reduce((n, i) => n + i.routes.length, 0),
      findingCount: items.length,
    }),
  );
  return jsonResponse({
    ok: true,
    advisoryOnly: true,
    mutationAuthorized: false,
    items,
  });
}

async function handleGenerateTriage(request: Request, env: PrismTriageRouteEnv): Promise<Response> {
  const started = Date.now();
  const body = await readJsonBody(request);
  const auditId = parseAuditIdFromGenerateBody(body);

  const audit = await readUiUxAudit(env, auditId);
  if (!audit) {
    return jsonResponse({ error: "Source audit not found" }, 404);
  }

  const sourceEvidenceHash = audit.evidenceHash;
  await emitPrismTriageTelemetry(
    env,
    buildPrismTriageTelemetry("prism_triage_generation_started", {
      auditIdHash: hashAuditId(auditId),
      evidenceHash: sourceEvidenceHash,
    }),
  );

  const existingMap = await loadExistingTriageMap(env, auditId);
  const generated = await generateTriageItemsFromAudit(audit, { existingById: existingMap });

  let created = 0;
  let updated = 0;
  for (const item of generated) {
    const prior = existingMap.get(item.triageId);
    if (!prior) {
      created += 1;
      await emitPrismTriageTelemetry(
        env,
        buildPrismTriageTelemetry("prism_triage_item_created", {
          auditIdHash: hashAuditId(auditId),
          triageId: item.triageId,
          severity: item.highestSeverity,
          priorityScore: item.priorityScore,
          routeCount: item.routes.length,
          findingCount: item.sourceFindingIds.length,
          evidenceHash: item.evidenceHash,
        }),
      );
    } else if (prior.evidenceHash !== item.evidenceHash) {
      item.status = prior.status === "new" ? "new" : prior.status;
      item.createdAt = prior.createdAt;
      updated += 1;
      await emitPrismTriageTelemetry(
        env,
        buildPrismTriageTelemetry("prism_triage_item_updated", {
          auditIdHash: hashAuditId(auditId),
          triageId: item.triageId,
          priorityScore: item.priorityScore,
          status: item.status,
        }),
      );
    } else {
      item.status = prior.status;
      item.createdAt = prior.createdAt;
      item.dispositionReason = prior.dispositionReason;
    }
    assertPrismTriageInvariants(item);
    await saveTriageItem(env, item);
  }

  await assertSourceAuditUnchanged(env, auditId, sourceEvidenceHash);
  await recordPrismTriageAuditEvent(env, {
    action: "prism.triage.generated",
    actorId: "operator",
    resourceType: "triage",
    resourceId: auditId,
    sourceAuditId: auditId,
    evidenceHash: sourceEvidenceHash,
    nextState: `created=${created},updated=${updated}`,
  });

  const items = await listTriageItemsForAudit(env, auditId);
  return jsonResponse({
    ok: true,
    advisoryOnly: true,
    mutationAuthorized: false,
    auditId,
    sourceAuditUnchanged: true,
    created,
    updated,
    items,
    durationMs: Date.now() - started,
  });
}

async function handleGetTriage(env: PrismTriageRouteEnv, triageId: string): Promise<Response> {
  const item = await readTriageItem(env, triageId);
  if (!item) {
    return jsonResponse({ error: "Triage item not found" }, 404);
  }
  const proposals = await listProposalsForTriage(env, triageId);
  return jsonResponse({
    ok: true,
    advisoryOnly: true,
    mutationAuthorized: false,
    item,
    proposals,
  });
}

async function handleDisposition(
  request: Request,
  env: PrismTriageRouteEnv,
  triageId: string,
): Promise<Response> {
  const item = await readTriageItem(env, triageId);
  if (!item) {
    return jsonResponse({ error: "Triage item not found" }, 404);
  }

  const body = await readJsonBody(request);
  const { status, reason } = parseDispositionBody(body);
  const transition = validateDispositionTransition(item.status, status);
  if (!transition.ok) {
    await emitPrismTriageTelemetry(
      env,
      buildPrismTriageTelemetry("prism_triage_invariant_failed", {
        triageId,
        status: item.status,
        evidenceHash: item.evidenceHash,
      }),
    );
    return jsonResponse({ error: transition.reason }, 400);
  }

  const priorState = item.status;
  item.status = status;
  item.dispositionReason = reason;
  item.updatedAt = new Date().toISOString();
  assertPrismTriageInvariants(item);
  await saveTriageItem(env, item);

  await emitPrismTriageTelemetry(
    env,
    buildPrismTriageTelemetry("prism_triage_disposition_recorded", {
      auditIdHash: hashAuditId(item.sourceAuditId),
      triageId,
      severity: item.highestSeverity,
      priorityScore: item.priorityScore,
      status,
      evidenceHash: item.evidenceHash,
    }),
  );

  await recordPrismTriageAuditEvent(env, {
    action: "prism.triage.disposition",
    actorId: "operator",
    resourceType: "triage",
    resourceId: triageId,
    sourceAuditId: item.sourceAuditId,
    priorState,
    nextState: status,
    evidenceHash: item.evidenceHash,
  });

  return jsonResponse({
    ok: true,
    advisoryOnly: true,
    mutationAuthorized: false,
    item,
    disposition: { status, reason },
  });
}

async function handleGenerateProposal(
  request: Request,
  env: PrismTriageRouteEnv,
  triageId: string,
): Promise<Response> {
  const started = Date.now();
  const body = request.method === "POST" ? await readJsonBody(request) : {};
  rejectExecutionFields(body);

  const item = await readTriageItem(env, triageId);
  if (!item) {
    return jsonResponse({ error: "Triage item not found" }, 404);
  }

  const audit = await readUiUxAudit(env, item.sourceAuditId);
  if (!audit) {
    return jsonResponse({ error: "Source audit not found" }, 404);
  }

  const sourceEvidenceHash = audit.evidenceHash;
  const revision = await getNextProposalRevision(env, triageId);
  const isRegeneration = revision > 1;

  await emitPrismTriageTelemetry(
    env,
    buildPrismTriageTelemetry(
      isRegeneration ? "prism_patch_proposal_regenerated" : "prism_patch_proposal_requested",
      {
        auditIdHash: hashAuditId(item.sourceAuditId),
        triageId,
        proposalRevision: revision,
        findingCount: item.sourceFindingIds.length,
      },
    ),
  );

  let proposal = await generatePatchProposal(item, audit, audit.findings, revision);
  proposal = await maybeEnrichPatchProposal(env, proposal);
  assertPrismPatchProposalInvariants(proposal);
  await savePatchProposal(env, proposal);

  item.status = "proposal_ready";
  item.updatedAt = new Date().toISOString();
  await saveTriageItem(env, item);

  await assertSourceAuditUnchanged(env, item.sourceAuditId, sourceEvidenceHash);
  await recordPrismTriageAuditEvent(env, {
    action: isRegeneration ? "prism.proposal.regenerated" : "prism.proposal.generated",
    actorId: "operator",
    resourceType: "proposal",
    resourceId: proposal.proposalId,
    sourceAuditId: item.sourceAuditId,
    evidenceHash: proposal.evidenceHash,
    nextState: `revision=${revision}`,
  });

  await emitPrismTriageTelemetry(
    env,
    buildPrismTriageTelemetry(
      isRegeneration ? "prism_patch_proposal_regenerated" : "prism_patch_proposal_generated",
      {
        auditIdHash: hashAuditId(item.sourceAuditId),
        triageId,
        proposalId: proposal.proposalId,
        severity: item.highestSeverity,
        proposalRevision: revision,
        durationMs: Date.now() - started,
        evidenceHash: proposal.evidenceHash,
      },
    ),
  );

  return jsonResponse({
    ok: true,
    advisoryOnly: true,
    mutationAuthorized: false,
    sourceAuditUnchanged: true,
    proposal,
    item,
  });
}

async function handleListProposals(env: PrismTriageRouteEnv): Promise<Response> {
  const proposals = await listProposalSummaries(env);
  return jsonResponse({
    ok: true,
    advisoryOnly: true,
    mutationAuthorized: false,
    proposals,
  });
}

async function handleGetProposal(env: PrismTriageRouteEnv, proposalId: string): Promise<Response> {
  const proposal = await readPatchProposal(env, proposalId);
  if (!proposal) {
    return jsonResponse({ error: "Proposal not found" }, 404);
  }
  return jsonResponse({
    ok: true,
    advisoryOnly: true,
    mutationAuthorized: false,
    proposal,
  });
}

export async function handlePrismTriageRoute(
  request: Request,
  pathname: string,
  env: PrismTriageRouteEnv,
): Promise<Response | null> {
  const method = request.method.toUpperCase();

  if (pathname === "/api/operator/uiux/triage" && method === "GET") {
    try {
      return await handleListTriage(env);
    } catch (err) {
      if (err instanceof PrismTriageStorageError) return jsonResponse({ error: err.message }, err.status);
      return jsonResponse({ error: "Failed to list triage queue" }, 500);
    }
  }

  if (pathname === "/api/operator/uiux/triage/generate" && method === "POST") {
    try {
      return await handleGenerateTriage(request, env);
    } catch (err) {
      if (err instanceof PrismTriageValidationError) return jsonResponse({ error: err.message }, err.status);
      if (err instanceof PrismTriageStorageError) return jsonResponse({ error: err.message }, err.status);
      return jsonResponse({ error: "Failed to generate triage queue" }, 500);
    }
  }

  if (pathname === "/api/operator/uiux/proposals" && method === "GET") {
    try {
      return await handleListProposals(env);
    } catch (err) {
      if (err instanceof PrismTriageStorageError) return jsonResponse({ error: err.message }, err.status);
      return jsonResponse({ error: "Failed to list proposals" }, 500);
    }
  }

  const triageMatch = /^\/api\/operator\/uiux\/triage\/([^/]+)$/.exec(pathname);
  if (triageMatch && method === "GET") {
    try {
      return await handleGetTriage(env, decodeURIComponent(triageMatch[1]));
    } catch (err) {
      if (err instanceof PrismTriageStorageError) return jsonResponse({ error: err.message }, err.status);
      return jsonResponse({ error: "Failed to read triage item" }, 500);
    }
  }

  const dispositionMatch = /^\/api\/operator\/uiux\/triage\/([^/]+)\/disposition$/.exec(pathname);
  if (dispositionMatch && method === "POST") {
    try {
      return await handleDisposition(request, env, decodeURIComponent(dispositionMatch[1]));
    } catch (err) {
      if (err instanceof PrismTriageValidationError) return jsonResponse({ error: err.message }, err.status);
      if (err instanceof PrismTriageStorageError) return jsonResponse({ error: err.message }, err.status);
      return jsonResponse({ error: "Failed to record disposition" }, 500);
    }
  }

  const proposalGenMatch = /^\/api\/operator\/uiux\/triage\/([^/]+)\/proposals$/.exec(pathname);
  if (proposalGenMatch && method === "POST") {
    try {
      return await handleGenerateProposal(request, env, decodeURIComponent(proposalGenMatch[1]));
    } catch (err) {
      if (err instanceof PrismTriageValidationError) return jsonResponse({ error: err.message }, err.status);
      if (err instanceof PrismTriageStorageError) return jsonResponse({ error: err.message }, err.status);
      return jsonResponse({ error: "Failed to generate proposal" }, 500);
    }
  }

  const proposalMatch = /^\/api\/operator\/uiux\/proposals\/([^/]+)$/.exec(pathname);
  if (proposalMatch && method === "GET") {
    try {
      return await handleGetProposal(env, decodeURIComponent(proposalMatch[1]));
    } catch (err) {
      if (err instanceof PrismTriageStorageError) return jsonResponse({ error: err.message }, err.status);
      return jsonResponse({ error: "Failed to read proposal" }, 500);
    }
  }

  return null;
}

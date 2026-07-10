import { getAgentGovernanceContextFor } from "../msh-ops/agent/initAgentGovernance";
import { checkAutonomy } from "../msh-ops/governance/checkAutonomy";
import type { AiGatewayEnv } from "./aiGateway";
import { maybeEnrichWithAi } from "./aiFulfillmentEnrichment";
import { generateUiUxAudit, PrismUiuxValidationError, validateUiUxAuditRequest } from "./data/prismUiuxEngine";
import { PRISM_UIUX_AGENT_ID } from "./data/prismUiuxTypes";
import type { UiUxApprovalRecord, UiUxAudit } from "./data/prismUiuxTypes";
import { resolveEffectiveKernelContext } from "./kernel";
import type { BackboneEnv } from "./backboneEnv";
import {
  applyApprovalToAudit,
  listUiUxAuditSummaries,
  PrismUiuxStorageError,
  readUiUxAudit,
  saveUiUxAudit,
  updateUiUxAudit,
} from "./prismUiuxStorage";
import type { PrismUiuxStorageEnv } from "./prismUiuxStorage";

export type PrismUiuxRouteEnv = PrismUiuxStorageEnv & BackboneEnv & AiGatewayEnv;

const MAX_BODY_BYTES = 32_768;

function jsonResponse(payload: unknown, status = 200): Response {
  return Response.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new PrismUiuxValidationError(400, "Content-Type must be application/json");
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    throw new PrismUiuxValidationError(400, "Payload too large");
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new PrismUiuxValidationError(400, "JSON body must be an object");
  }
  return parsed as Record<string, unknown>;
}

function parseAuditId(pathname: string): string | null {
  const match = /^\/api\/operator\/uiux\/audits\/([^/]+)(?:\/(approve|reject))?$/.exec(pathname);
  return match?.[1] ?? null;
}

function buildEnrichmentPrompt(audit: UiUxAudit): string {
  const top = audit.findings.slice(0, 5).map((f) => `- [${f.severity}] ${f.recommendation}`).join("\n");
  return (
    `PRISM UI/UX audit mode=${audit.mode} score=${audit.scorecard.overall}/100 ` +
    `release=${audit.releaseRecommendation}. Top findings:\n${top}\n` +
    `Provide 3-5 concise advisory bullets for operator review. Do not authorize mutations.`
  );
}

async function maybeEnrichAudit(env: PrismUiuxRouteEnv, audit: UiUxAudit): Promise<UiUxAudit> {
  const governance = getAgentGovernanceContextFor(PRISM_UIUX_AGENT_ID);
  const decision = checkAutonomy(
    {
      agentId: PRISM_UIUX_AGENT_ID,
      actionKind: "advisory",
      description: "PRISM UI/UX advisory enrichment",
      axis: "TRUST",
      priorityIndex: 2,
    },
    governance,
  );
  if (decision.decision === "denied") {
    return audit;
  }

  const started = Date.now();
  const kernelCtx = await resolveEffectiveKernelContext(env);
  const enriched = await maybeEnrichWithAi(
    env,
    governance,
    {
      agentId: PRISM_UIUX_AGENT_ID,
      actionKind: "advisory",
      description: "PRISM UI/UX advisory enrichment",
      axis: "TRUST",
      priorityIndex: 2,
    },
    { auditId: audit.auditId, scorecard: audit.scorecard, findings: audit.findings },
    buildEnrichmentPrompt(audit),
    kernelCtx.policy,
    kernelCtx.signalStates,
  );

  if (typeof enriched.ai_enrichment === "string") {
    return {
      ...audit,
      ai_enrichment: enriched.ai_enrichment,
      ai_model: enriched.ai_model,
      ai_latency_ms: Date.now() - started,
    };
  }
  return audit;
}

async function handleCreateAudit(request: Request, env: PrismUiuxRouteEnv): Promise<Response> {
  const body = await readJsonBody(request);
  const uiRequest = validateUiUxAuditRequest(body);
  let audit = await generateUiUxAudit(uiRequest);
  audit = await maybeEnrichAudit(env, audit);
  await saveUiUxAudit(env, audit);
  return jsonResponse({ ok: true, audit, status: "prism-uiux-audit-complete" });
}

async function handleListAudits(env: PrismUiuxRouteEnv): Promise<Response> {
  const audits = await listUiUxAuditSummaries(env);
  return jsonResponse({ ok: true, audits });
}

async function handleGetAudit(env: PrismUiuxRouteEnv, auditId: string): Promise<Response> {
  const audit = await readUiUxAudit(env, auditId);
  if (!audit) {
    return jsonResponse({ error: "Audit not found" }, 404);
  }
  return jsonResponse({ ok: true, audit });
}

function parseApprovalBody(body: Record<string, unknown>): { findingIds: string[]; patchProposalIds?: string[]; note?: string } {
  const findingIds = Array.isArray(body.findingIds)
    ? body.findingIds.filter((id): id is string => typeof id === "string")
    : [];
  const patchProposalIds = Array.isArray(body.patchProposalIds)
    ? body.patchProposalIds.filter((id): id is string => typeof id === "string")
    : undefined;
  const note = typeof body.note === "string" ? body.note.slice(0, 2000) : undefined;
  return { findingIds, patchProposalIds, note };
}

async function handleApproveAudit(request: Request, env: PrismUiuxRouteEnv, auditId: string): Promise<Response> {
  const audit = await readUiUxAudit(env, auditId);
  if (!audit) {
    return jsonResponse({ error: "Audit not found" }, 404);
  }

  const body = await readJsonBody(request);
  const { findingIds, patchProposalIds, note } = parseApprovalBody(body);

  const record: UiUxApprovalRecord = {
    id: crypto.randomUUID(),
    auditId,
    action: "approve",
    findingIds,
    patchProposalIds,
    operatorNote: note,
    recordedAt: new Date().toISOString(),
    mutationAuthorized: false,
  };

  const updated = applyApprovalToAudit(audit, record);
  await updateUiUxAudit(env, updated);
  return jsonResponse({ ok: true, audit: updated, approval: record, status: "prism-uiux-approved" });
}

async function handleRejectAudit(request: Request, env: PrismUiuxRouteEnv, auditId: string): Promise<Response> {
  const audit = await readUiUxAudit(env, auditId);
  if (!audit) {
    return jsonResponse({ error: "Audit not found" }, 404);
  }

  const body = await readJsonBody(request);
  const { findingIds, patchProposalIds, note } = parseApprovalBody(body);

  const record: UiUxApprovalRecord = {
    id: crypto.randomUUID(),
    auditId,
    action: "reject",
    findingIds,
    patchProposalIds,
    operatorNote: note,
    recordedAt: new Date().toISOString(),
    mutationAuthorized: false,
  };

  const updated = applyApprovalToAudit(audit, record);
  await updateUiUxAudit(env, updated);
  return jsonResponse({ ok: true, audit: updated, approval: record, status: "prism-uiux-rejected" });
}

export async function handlePrismUiuxRoute(
  request: Request,
  pathname: string,
  env: PrismUiuxRouteEnv,
): Promise<Response | null> {
  const method = request.method.toUpperCase();

  if (pathname === "/api/operator/uiux/audits" && method === "POST") {
    try {
      return await handleCreateAudit(request, env);
    } catch (err) {
      if (err instanceof PrismUiuxValidationError) {
        return jsonResponse({ error: err.message }, err.status);
      }
      if (err instanceof PrismUiuxStorageError) {
        return jsonResponse({ error: err.message }, err.status);
      }
      return jsonResponse({ error: "Failed to create audit" }, 500);
    }
  }

  if (pathname === "/api/operator/uiux/audits" && method === "GET") {
    try {
      return await handleListAudits(env);
    } catch (err) {
      if (err instanceof PrismUiuxStorageError) {
        return jsonResponse({ error: err.message }, err.status);
      }
      return jsonResponse({ error: "Failed to list audits" }, 500);
    }
  }

  const auditId = parseAuditId(pathname);
  if (!auditId) return null;

  if (pathname === `/api/operator/uiux/audits/${auditId}` && method === "GET") {
    try {
      return await handleGetAudit(env, auditId);
    } catch (err) {
      if (err instanceof PrismUiuxStorageError) {
        return jsonResponse({ error: err.message }, err.status);
      }
      return jsonResponse({ error: "Failed to read audit" }, 500);
    }
  }

  if (pathname === `/api/operator/uiux/audits/${auditId}/approve` && method === "POST") {
    try {
      return await handleApproveAudit(request, env, auditId);
    } catch (err) {
      if (err instanceof PrismUiuxValidationError) {
        return jsonResponse({ error: err.message }, err.status);
      }
      if (err instanceof PrismUiuxStorageError) {
        return jsonResponse({ error: err.message }, err.status);
      }
      return jsonResponse({ error: "Failed to approve audit" }, 500);
    }
  }

  if (pathname === `/api/operator/uiux/audits/${auditId}/reject` && method === "POST") {
    try {
      return await handleRejectAudit(request, env, auditId);
    } catch (err) {
      if (err instanceof PrismUiuxValidationError) {
        return jsonResponse({ error: err.message }, err.status);
      }
      if (err instanceof PrismUiuxStorageError) {
        return jsonResponse({ error: err.message }, err.status);
      }
      return jsonResponse({ error: "Failed to reject audit" }, 500);
    }
  }

  return null;
}

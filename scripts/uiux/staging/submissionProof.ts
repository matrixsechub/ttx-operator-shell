import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { UiUxAudit } from "../../../worker/data/prismUiuxTypes.ts";
import { evidenceHash } from "../hash.ts";
import { manifestToAuditRequest } from "../prismAdapter.ts";
import { redactObject } from "../redact.ts";
import type { PrismCaptureManifest } from "../types.ts";
import type { PrismStagingSubmissionProof } from "./types.ts";
import { bootstrapEdgeApiToken } from "./edgeAuth.ts";
import { emitStagingTelemetry } from "./telemetry.ts";

function assertAuditInvariants(audit: UiUxAudit): void {
  if (audit.advisoryOnly !== true) {
    throw new Error("PRISM audit advisoryOnly invariant violated");
  }
  if (audit.councilEnvelope?.advisoryOnly !== true) {
    throw new Error("Council envelope advisoryOnly invariant violated");
  }
}

export async function proveStagingSubmission(
  origin: string,
  manifest: PrismCaptureManifest,
  artifactDir?: string,
  bearerToken?: string,
): Promise<PrismStagingSubmissionProof> {
  const edge = bearerToken ? { ok: true as const, token: bearerToken } : await bootstrapEdgeApiToken(origin);
  if (!edge.ok) throw new Error(edge.error);

  const request = manifestToAuditRequest(manifest, "ACCESSIBILITY_CHECK");
  const idempotencyKeyHash = evidenceHash({ key: request.idempotencyKey ?? manifest.idempotencyKey });
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${edge.token}`,
  };

  if (artifactDir) {
    writeFileSync(join(artifactDir, "prism-request.json"), JSON.stringify(redactObject(request), null, 2));
  }

  const firstResponse = await fetch(new URL("/api/operator/uiux/audits", origin), {
    method: "POST",
    headers,
    body: JSON.stringify(redactObject(request)),
  });
  const firstBody = (await firstResponse.json()) as { audit?: UiUxAudit; duplicate?: boolean };
  if (artifactDir) {
    writeFileSync(join(artifactDir, "prism-response.json"), JSON.stringify(redactObject(firstBody), null, 2));
  }
  if (!firstResponse.ok || !firstBody.audit) {
    throw new Error(`PRISM submission failed (${firstResponse.status})`);
  }

  assertAuditInvariants(firstBody.audit);
  const auditId = firstBody.audit.auditId;

  emitStagingTelemetry({
    event: "prism_staging_audit_submitted",
    captureId: manifest.captureId,
    auditId,
    timestamp: new Date().toISOString(),
  });

  const fetched = await fetch(new URL(`/api/operator/uiux/audits/${auditId}`, origin), { headers });
  const fetchedBody = (await fetched.json()) as { audit?: UiUxAudit };
  const fetchedAuditMatched = fetched.ok && fetchedBody.audit?.auditId === auditId;

  const idemLookup = await fetch(
    new URL(`/api/operator/uiux/audits/idempotency/${encodeURIComponent(request.idempotencyKey ?? manifest.idempotencyKey)}`, origin),
    { headers },
  );

  const duplicateResponse = await fetch(new URL("/api/operator/uiux/audits", origin), {
    method: "POST",
    headers,
    body: JSON.stringify(redactObject(request)),
  });
  const duplicateBody = (await duplicateResponse.json()) as { audit?: UiUxAudit; duplicate?: boolean };
  const duplicatePrevented =
    duplicateResponse.ok &&
    duplicateBody.duplicate === true &&
    duplicateBody.audit?.auditId === auditId;

  emitStagingTelemetry({
    event: "prism_staging_idempotency_verified",
    captureId: manifest.captureId,
    auditId,
    result: duplicatePrevented ? "ok" : "failed",
    timestamp: new Date().toISOString(),
  });

  const proofBase = {
    captureId: manifest.captureId,
    idempotencyKeyHash,
    auditId,
    firstSubmissionStatus: firstResponse.status,
    duplicateSubmissionStatus: duplicateResponse.status,
    fetchedAuditMatched,
    persisted: fetchedAuditMatched && idemLookup.ok,
    duplicatePrevented,
    advisoryOnly: firstBody.audit.advisoryOnly === true,
    mutationAuthorized: false as const,
    councilEnvelopePresent: Boolean(firstBody.audit.councilEnvelope?.agentId),
    completedAt: new Date().toISOString(),
  };

  const proof: PrismStagingSubmissionProof = {
    ...proofBase,
    evidenceHash: evidenceHash(proofBase),
    passed:
      proofBase.firstSubmissionStatus === 200 &&
      proofBase.fetchedAuditMatched &&
      proofBase.duplicatePrevented &&
      proofBase.advisoryOnly &&
      proofBase.mutationAuthorized === false &&
      proofBase.councilEnvelopePresent,
  };

  if (!proof.passed) {
    throw new Error("Staging submission proof failed one or more checks");
  }

  return proof;
}

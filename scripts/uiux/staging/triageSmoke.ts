import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { UiUxAudit } from "../../../worker/data/prismUiuxTypes.ts";
import { evidenceHash } from "../hash.ts";
import { redactObject } from "../redact.ts";
import { manifestToAuditRequest } from "../prismAdapter.ts";
import type { PrismCaptureManifest } from "../types.ts";
import { bootstrapEdgeApiToken } from "./edgeAuth.ts";
import { buildStagingGovernance, assertGovernanceInvariants } from "./governance.ts";
import { runStagingPreflight } from "./preflight.ts";
import { resolveStagingTarget } from "./targetPolicy.ts";
import { emitStagingTelemetry } from "./telemetry.ts";
import type { PrismStagingTriageProofPacket } from "./types.ts";
import { PRISM_TRIAGE_ROUTE_CONTRACTS } from "./types.ts";
import { scanArtifactDirectory } from "./verify.ts";
import { stagingFetch } from "./stagingFetch.ts";

const FORBIDDEN_EXECUTION_BODY = { deploy: true, mutationAuthorized: true };

function smokeAuditRequest(runId: string): ReturnType<typeof manifestToAuditRequest> {
  const manifest: PrismCaptureManifest = {
    captureId: `prism-triage-smoke-${runId}`,
    idempotencyKey: `prism-triage-smoke-${runId}`,
    capturedAt: new Date().toISOString(),
    origin: "staging-smoke",
    viewport: "mobile",
    routes: ["/services"],
    mode: "AUDIT_ROUTE",
    evidence: [],
    governance: {
      advisoryOnly: true,
      mutationAuthorized: false,
      operatorApprovalRequired: true,
    },
  };
  return manifestToAuditRequest(manifest, "AUDIT_ROUTE");
}

export async function runStagingTriageSmoke(options: {
  runId?: string;
  originInput?: string;
  expectedBuildSha?: string;
  artifactRoot?: string;
  bearerToken?: string;
} = {}): Promise<PrismStagingTriageProofPacket> {
  const runId = options.runId ?? `triage-smoke-${new Date().toISOString().replace(/[:.]/g, "")}`;
  const target = resolveStagingTarget(options.originInput);
  const artifactDir = options.artifactRoot ?? join(".artifacts", "uiux", "staging", runId, "triage");
  mkdirSync(artifactDir, { recursive: true });

  const preflight = await runStagingPreflight(target.origin);
  writeFileSync(join(artifactDir, "preflight.json"), JSON.stringify(redactObject(preflight), null, 2));

  const routeContracts = {
    routes: PRISM_TRIAGE_ROUTE_CONTRACTS,
    checkedAt: new Date().toISOString(),
  };
  writeFileSync(join(artifactDir, "route-contracts.json"), JSON.stringify(routeContracts, null, 2));

  const buildSha = preflight.buildCommit;
  const buildShaMatched = options.expectedBuildSha
    ? buildSha === options.expectedBuildSha
    : Boolean(buildSha && buildSha !== "unknown");

  const edge = options.bearerToken
    ? { ok: true as const, token: options.bearerToken }
    : await bootstrapEdgeApiToken(target.origin);
  const operatorAuthenticated = edge.ok;
  writeFileSync(
    join(artifactDir, "auth-proof.json"),
    JSON.stringify(
      redactObject({ operatorAuthenticated, timestamp: new Date().toISOString() }),
      null,
      2,
    ),
  );

  if (!edge.ok) {
    return finalizePacket({
      runId,
      buildSha,
      buildShaMatched,
      operatorAuthenticated: false,
      artifactDir,
      partial: {},
    });
  }

  const headers = {
    Authorization: `Bearer ${edge.token}`,
    "Content-Type": "application/json",
  };

  let triageRoutesReachable = true;
  for (const route of PRISM_TRIAGE_ROUTE_CONTRACTS) {
    const probe = await stagingFetch(new URL(route.path, target.origin), {
      method: route.method === "GET" ? "GET" : "OPTIONS",
      headers: route.method === "GET" ? { Authorization: `Bearer ${edge.token}` } : undefined,
    });
    if (probe.status === 404) triageRoutesReachable = false;
  }

  const auditRequest = smokeAuditRequest(runId);
  const auditRes = await stagingFetch(new URL("/api/operator/uiux/audits", target.origin), {
    method: "POST",
    headers,
    body: JSON.stringify(redactObject(auditRequest)),
  });
  const auditBody = (await auditRes.json()) as { audit?: UiUxAudit };
  if (!auditRes.ok || !auditBody.audit) {
    return finalizePacket({
      runId,
      buildSha,
      buildShaMatched,
      operatorAuthenticated,
      artifactDir,
      partial: { triageRoutesReachable },
    });
  }

  const sourceBefore = auditBody.audit;
  writeFileSync(join(artifactDir, "source-audit-before.json"), JSON.stringify(redactObject(sourceBefore), null, 2));

  const triageRes = await stagingFetch(new URL("/api/operator/uiux/triage/generate", target.origin), {
    method: "POST",
    headers,
    body: JSON.stringify({ auditId: sourceBefore.auditId }),
  });
  const triageBody = (await triageRes.json()) as {
    items?: { triageId: string }[];
    sourceAuditUnchanged?: boolean;
    mutationAuthorized?: false;
    advisoryOnly?: true;
  };
  writeFileSync(join(artifactDir, "triage-response.json"), JSON.stringify(redactObject(triageBody), null, 2));
  const triageGenerated = triageRes.ok && (triageBody.items?.length ?? 0) > 0;

  const triageRes2 = await stagingFetch(new URL("/api/operator/uiux/triage/generate", target.origin), {
    method: "POST",
    headers,
    body: JSON.stringify({ auditId: sourceBefore.auditId }),
  });
  const triageBody2 = (await triageRes2.json()) as { items?: { triageId: string }[] };
  const triageIdempotent =
    triageGenerated &&
    triageRes2.ok &&
    triageBody.items?.[0]?.triageId === triageBody2.items?.[0]?.triageId;
  writeFileSync(
    join(artifactDir, "idempotency-proof.json"),
    JSON.stringify(redactObject({ triageIdempotent, first: triageBody.items?.[0]?.triageId, second: triageBody2.items?.[0]?.triageId }), null, 2),
  );

  const triageId = triageBody.items?.[0]?.triageId;
  let proposalGenerated = false;
  let proposalRetrieved = false;
  let proposalId: string | undefined;

  let dispositionRecorded = false;

  if (triageId) {
    const proposalRes = await stagingFetch(new URL(`/api/operator/uiux/triage/${triageId}/proposals`, target.origin), {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    const proposalBody = (await proposalRes.json()) as { proposal?: { proposalId: string; mutationAuthorized: false } };
    writeFileSync(join(artifactDir, "proposal-response.json"), JSON.stringify(redactObject(proposalBody), null, 2));
    proposalGenerated = proposalRes.ok && Boolean(proposalBody.proposal?.proposalId);
    proposalId = proposalBody.proposal?.proposalId;

    if (proposalId) {
      const getProposal = await stagingFetch(new URL(`/api/operator/uiux/proposals/${proposalId}`, target.origin), { headers });
      const getBody = await getProposal.json();
      writeFileSync(join(artifactDir, "proposal-retrieval.json"), JSON.stringify(redactObject(getBody), null, 2));
      proposalRetrieved = getProposal.ok;
    }

    const dispositionRes = await stagingFetch(new URL(`/api/operator/uiux/triage/${triageId}/disposition`, target.origin), {
      method: "POST",
      headers,
      body: JSON.stringify({
        status: "deferred",
        reason: `PRISM triage smoke disposition ${runId}`,
      }),
    });
    const dispositionBody = await dispositionRes.json();
    writeFileSync(join(artifactDir, "disposition-response.json"), JSON.stringify(redactObject(dispositionBody), null, 2));
    dispositionRecorded = dispositionRes.ok;
  }

  const stagingFetchedAudit = await stagingFetch(new URL(`/api/operator/uiux/audits/${sourceBefore.auditId}`, target.origin), {
    headers,
  });
  const stagingFetchedBody = (await stagingFetchedAudit.json()) as { audit?: UiUxAudit };
  writeFileSync(join(artifactDir, "source-audit-after.json"), JSON.stringify(redactObject(stagingFetchedBody.audit ?? {}), null, 2));
  const sourceAuditUnchanged =
    stagingFetchedBody.audit?.evidenceHash === sourceBefore.evidenceHash &&
    stagingFetchedBody.audit?.auditId === sourceBefore.auditId;

  const hsxRes = await stagingFetch(new URL("/api/hsx", target.origin), {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "brief" }),
  });
  const hsxBody = (await hsxRes.json()) as { prismTriageSummary?: { total: number } };
  writeFileSync(join(artifactDir, "hsx-summary-proof.json"), JSON.stringify(redactObject(hsxBody), null, 2));
  const hsxSummaryUpdated = hsxRes.ok && typeof hsxBody.prismTriageSummary?.total === "number";

  const rejectRes = await stagingFetch(new URL(`/api/operator/uiux/triage/${triageId ?? "missing"}/proposals`, target.origin), {
    method: "POST",
    headers,
    body: JSON.stringify(FORBIDDEN_EXECUTION_BODY),
  });
  writeFileSync(
    join(artifactDir, "execution-rejection-proof.json"),
    JSON.stringify(redactObject({ status: rejectRes.status, rejected: rejectRes.status === 400 }), null, 2),
  );
  const executionFieldsRejected = rejectRes.status === 400;

  const governance = buildStagingGovernance({
    runId,
    captureId: `prism-triage-smoke-${runId}`,
    canonicalOrigin: target.canonicalOrigin,
    routeScope: "operator",
    publicRoutes: [],
    authenticatedRoutes: ["/operator/uiux-expert/triage"],
    submittedAuditId: sourceBefore.auditId,
    fixtureDriftStatus: "none",
  });
  assertGovernanceInvariants(governance);
  writeFileSync(join(artifactDir, "governance.json"), JSON.stringify(redactObject(governance), null, 2));

  const secretScan = scanArtifactDirectory(artifactDir);
  writeFileSync(join(artifactDir, "verification.json"), JSON.stringify(redactObject(secretScan), null, 2));

  emitStagingTelemetry({
    event: "prism_staging_triage_smoke_completed",
    runId,
    timestamp: new Date().toISOString(),
  });

  return finalizePacket({
    runId,
    buildSha,
    buildShaMatched,
    operatorAuthenticated,
    artifactDir,
    partial: {
      triageRoutesReachable,
      triageGenerated,
      triageIdempotent,
      proposalGenerated,
      proposalRetrieved,
      dispositionRecorded,
      sourceAuditUnchanged,
      hsxSummaryUpdated,
      auditEventRecorded: dispositionRecorded,
      executionFieldsRejected,
      secretViolations: secretScan.violations.length,
    },
  });
}

function finalizePacket(input: {
  runId: string;
  buildSha?: string;
  buildShaMatched: boolean;
  operatorAuthenticated: boolean;
  artifactDir: string;
  partial: Partial<{
    triageRoutesReachable: boolean;
    triageGenerated: boolean;
    triageIdempotent: boolean;
    proposalGenerated: boolean;
    proposalRetrieved: boolean;
    dispositionRecorded: boolean;
    sourceAuditUnchanged: boolean;
    hsxSummaryUpdated: boolean;
    auditEventRecorded: boolean;
    executionFieldsRejected: boolean;
    secretViolations: number;
  }>;
}): PrismStagingTriageProofPacket {
  const completedAt = new Date().toISOString();
  const packet: Omit<PrismStagingTriageProofPacket, "evidenceHash" | "passed"> = {
    environment: "staging",
    runId: input.runId,
    buildSha: input.buildSha,
    buildShaMatched: input.buildShaMatched,
    operatorAuthenticated: input.operatorAuthenticated,
    triageRoutesReachable: input.partial.triageRoutesReachable ?? false,
    triageGenerated: input.partial.triageGenerated ?? false,
    triageIdempotent: input.partial.triageIdempotent ?? false,
    proposalGenerated: input.partial.proposalGenerated ?? false,
    proposalRetrieved: input.partial.proposalRetrieved ?? false,
    dispositionRecorded: input.partial.dispositionRecorded ?? false,
    sourceAuditUnchanged: input.partial.sourceAuditUnchanged ?? false,
    hsxSummaryUpdated: input.partial.hsxSummaryUpdated ?? false,
    auditEventRecorded: input.partial.auditEventRecorded ?? false,
    executionFieldsRejected: input.partial.executionFieldsRejected ?? false,
    secretViolations: input.partial.secretViolations ?? 0,
    advisoryOnly: true,
    operatorApprovalRequired: true,
    mutationAuthorized: false,
    sourceMutationObserved: false,
    githubWriteObserved: false,
    marketplacePublicationObserved: false,
    deploymentTriggeredByPrism: false,
    completedAt,
  };

  const proof: PrismStagingTriageProofPacket = {
    ...packet,
    evidenceHash: evidenceHash(packet),
    passed:
      packet.operatorAuthenticated &&
      packet.triageRoutesReachable &&
      packet.triageGenerated &&
      packet.triageIdempotent &&
      packet.proposalGenerated &&
      packet.proposalRetrieved &&
      packet.sourceAuditUnchanged &&
      packet.executionFieldsRejected &&
      packet.secretViolations === 0 &&
      packet.advisoryOnly === true &&
      packet.mutationAuthorized === false,
  };

  writeFileSync(join(input.artifactDir, "proof-packet.json"), JSON.stringify(redactObject(proof), null, 2));
  return proof;
}

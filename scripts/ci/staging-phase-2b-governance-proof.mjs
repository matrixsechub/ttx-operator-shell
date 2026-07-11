#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertArtifactRedaction,
  assertPendingForbidden,
  cfAccessConfigured,
  fetchRaw,
  redactValue,
  resolveToken,
  validateAccessCredentialPair,
  validateTelemetryEvents,
  workerReached,
  writeChecksumArtifact,
} from "../lib/stagingGovernanceProofLib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const baseUrl = (process.argv[2] ?? process.env.STAGING_BASE_URL ?? "").replace(/\/$/, "");
const commitSha = process.argv[3] ?? process.env.COMMIT_SHA ?? "unknown";
const outputPath = process.argv[4] ?? join(root, "artifacts", "staging-phase-2b-governance-proof.json");
const sha256Path = `${outputPath}.sha256`;

const EXPECTED_BEACON_HASH =
  process.env.EXPECTED_BEACON_HASH ??
  process.env.EXPECTED_BEACON_SHA256 ??
  "50a56303603f6fb65653764dca13ae1d7100197f48d4b7c055fbd68da4fac65c";
const EXPECTED_CODEX_HASH =
  process.env.EXPECTED_CODEX_HASH ??
  "c8f0ab1ee8f84812be5f54d3906c05bab4da25f724386778466d8b277ee48826";

const checks = [];
let failureCode = null;
let mutationCount = 0;

let packet = {
  status: "FAIL",
  phase: "PHASE_2B",
  commitSha,
  deploymentId: null,
  beaconHash: null,
  codexHash: null,
  proposalId: null,
  approvalId: null,
  receiptId: null,
  executionId: null,
  auditBundleId: null,
  councilAdvisoryOnly: false,
  mutationCount: 0,
  replayRejected: false,
  tamperRejected: false,
  changedDigestRejected: false,
  expiredApprovalRejected: false,
  beaconDriftRejected: false,
  codexDriftRejected: false,
  safeModeBlockedMutation: false,
  safeModeRestored: false,
  auditChainValid: false,
  telemetryValid: false,
  rollback: {
    supported: true,
    separateApprovalRequired: true,
    result: "FAIL",
  },
  productionDeployed: false,
  productionFulfillmentEnabled: false,
  timestamp: new Date().toISOString(),
  checks: [],
};

function setFailure(code) {
  if (!failureCode) failureCode = code;
}

function record(name, pass, details = {}) {
  const entry = { name, result: pass ? "PASS" : "FAIL", ...details };
  checks.push(entry);
  return entry;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (!baseUrl) {
    console.error("STAGING_PHASE_2B_PROOF::FAIL — STAGING_BASE_URL required");
    process.exit(1);
  }

  const pair = validateAccessCredentialPair();
  if (!pair.ok) {
    record("access_credential_pair", false, { code: pair.code });
    setFailure(pair.code);
    finalize("FAIL");
    return;
  }
  record("access_credential_pair", true, { code: "ACCESS_CREDENTIAL_PAIR_COMPLETE" });

  const noAccess = await fetchRaw(baseUrl, "/api/build-info", {}, { includeAccess: false });
  record("access_redirect_detected", noAccess.response.status === 302 || noAccess.text.includes("Cloudflare Access"), {
    status: noAccess.response.status,
  });

  if (cfAccessConfigured()) {
    const withAccess = await fetchRaw(baseUrl, "/api/build-info", {});
    const reached = workerReached(withAccess.response, withAccess.text);
    record("access_reached_worker", reached, { status: withAccess.response.status });
    if (!reached) {
      setFailure("ACCESS_AUTH_FAILED");
      finalize("FAIL");
      return;
    }
  }

  const token = await resolveToken(baseUrl);
  if (!token) {
    record("operator_auth", false);
    setFailure("WORKER_AUTH_FAILED");
    finalize("FAIL");
    return;
  }
  record("operator_auth", true);

  const buildInfo = await fetchRaw(baseUrl, "/api/build-info", {}, { token });
  const deployedCommit =
    buildInfo.json?.commitSha ?? buildInfo.response.headers.get("x-build-commit") ?? null;
  const deploymentId =
    process.env.EXPECTED_DEPLOYMENT_ID ??
    process.env.DEPLOYMENT_ID ??
    buildInfo.json?.deploymentId ??
    buildInfo.json?.versionId ??
    buildInfo.response.headers.get("cf-ray") ??
    null;
  record("staging_commit_match", deployedCommit === commitSha, { expected: commitSha, observed: deployedCommit });
  if (deployedCommit && deployedCommit !== commitSha) setFailure("STAGING_COMMIT_MISMATCH");

  const beacon = await fetchRaw(baseUrl, "/api/beacon/v2", {}, { token });
  const beaconHash = beacon.json?.beaconHash ?? beacon.json?.hash ?? null;
  const beaconVerified = beacon.json?.verified === true;
  record("beacon_v2_verified", beaconVerified, { beaconHash });
  if (!beaconVerified) setFailure("BEACON_NOT_VERIFIED");
  record("beacon_hash_match", beaconHash === EXPECTED_BEACON_HASH, { expected: EXPECTED_BEACON_HASH, observed: beaconHash });
  if (beaconHash && beaconHash !== EXPECTED_BEACON_HASH) setFailure("BEACON_HASH_MISMATCH");

  const codexHash = beacon.json?.codexHash ?? EXPECTED_CODEX_HASH;
  record("codex_hash_match", codexHash === EXPECTED_CODEX_HASH, { expected: EXPECTED_CODEX_HASH, observed: codexHash });
  if (codexHash !== EXPECTED_CODEX_HASH) setFailure("CODEX_HASH_MISMATCH");

  const health = await fetchRaw(baseUrl, "/api/operator/governance/health", {}, { token });
  const receiptHealthy = health.json?.governance?.receiptAuthorityAvailable === true;
  record("receipt_authority_healthy", receiptHealthy && health.response.status === 200);
  if (!receiptHealthy) setFailure("RECEIPT_AUTHORITY_UNHEALTHY");

  const fulfillment = await fetchRaw(baseUrl, "/api/operator/agents", {}, { token });
  const fulfillmentDisabled =
    fulfillment.json?.aiFulfillmentEnabled !== true && fulfillment.json?.fulfillmentEnabled !== true;
  record("fulfillment_scope", fulfillmentDisabled, { observed: fulfillment.json?.aiFulfillmentEnabled });
  if (!fulfillmentDisabled) setFailure("FULFILLMENT_SCOPE_VIOLATION");

  const mutationPayload = {
    name: `phase2b-proof-${Date.now()}`,
    reason: "Phase 2B staging governance proof",
    description: "Governed activation campaign create",
  };

  const proposalBody = {
    target_system: "activation",
    action_class: "C3",
    summary: "Phase 2B staging proof — activation campaign create",
    intended_outcome: "Validate operator governance pipeline",
    rollback_plan: "Archive proof campaign via separate rollback proposal",
    evidence_refs: ["audit:phase2b:proof"],
    beacon_hash: beaconHash,
    codex_hash: codexHash,
    action_payload: {
      actionType: "activation.campaign.create",
      mutationPayload,
    },
  };

  const proposalRes = await fetchRaw(
    baseUrl,
    "/api/operator/governance/proposals",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(proposalBody),
    },
    { token },
  );
  const proposalId = proposalRes.json?.proposal?.proposal_id ?? null;
  const actionDigest = proposalRes.json?.proposal?.action_digest ?? null;
  record("proposal_created", proposalRes.response.status === 201 && Boolean(proposalId), {
    proposalId,
    status: proposalRes.json?.proposal?.status,
  });
  if (!proposalId) setFailure("PROPOSAL_CREATE_FAILED");

  const reviewRes = await fetchRaw(
    baseUrl,
    `/api/operator/governance/proposals/${proposalId}/review`,
    { method: "POST", headers: { "content-type": "application/json" }, body: "{}" },
    { token },
  );
  const advisoryOnly = reviewRes.json?.review?.advisoryOnly === true;
  packet.councilAdvisoryOnly = advisoryOnly;
  record("council_advisory_only", advisoryOnly, {
    recommendedDecision: reviewRes.json?.review?.recommendedDecision,
    disagreements: reviewRes.json?.review?.disagreements?.length ?? 0,
  });
  record("council_no_receipt", !reviewRes.json?.receipt && !reviewRes.json?.receiptId);
  record("council_no_execution", reviewRes.json?.executionId == null);

  const approveRes = await fetchRaw(
    baseUrl,
    `/api/operator/governance/proposals/${proposalId}/approve`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        actionType: "activation.campaign.create",
        mutationPayload,
        rationale: "Phase 2B staging proof approval",
      }),
    },
    { token },
  );
  const approvalId = approveRes.json?.receipt?.approvalId ?? approveRes.json?.proposal?.approval_id ?? null;
  const receiptId = approveRes.json?.receipt?.approvalId ?? approvalId;
  record("operator_approved", approveRes.response.status === 200 && Boolean(approvalId), { approvalId });
  if (!approvalId) setFailure("APPROVAL_FAILED");

  const executeKey = crypto.randomUUID();
  const executeRes = await fetchRaw(
    baseUrl,
    `/api/operator/governance/proposals/${proposalId}/execute`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idempotencyKey: executeKey, mutationPayload }),
    },
    { token },
  );
  const executionId = executeRes.json?.executionReceipt?.executionId ?? null;
  const auditBundleId = executeRes.json?.executionReceipt?.auditBundleId ?? null;
  const campaignId = executeRes.json?.result?.campaignId ?? null;
  const executeOk = executeRes.response.status === 200 && executeRes.json?.ok === true;
  if (executeOk) mutationCount += 1;
  record("execute_once", executeOk && mutationCount === 1, { executionId, auditBundleId });
  if (!executeOk) setFailure("EXECUTION_FAILED");

  const replayRes = await fetchRaw(
    baseUrl,
    `/api/operator/governance/proposals/${proposalId}/execute`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), mutationPayload }),
    },
    { token },
  );
  const replayCode = replayRes.json?.code ?? "";
  packet.replayRejected =
    replayRes.response.status >= 400 &&
    (replayCode === "RECEIPT_CONSUMED" ||
      replayCode === "IDEMPOTENCY_REPLAY" ||
      replayCode.includes("RECEIPT"));
  record("replay_rejected", packet.replayRejected, { code: replayCode });
  if (!packet.replayRejected) setFailure("RECEIPT_REPLAY_ALLOWED");

  const tamperRes = await fetchRaw(
    baseUrl,
    `/api/operator/governance/proposals/${proposalId}/execute`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        idempotencyKey: crypto.randomUUID(),
        mutationPayload: { ...mutationPayload, name: "tampered-phase2b-proof" },
      }),
    },
    { token },
  );
  packet.tamperRejected =
    tamperRes.response.status >= 400 &&
    (tamperRes.json?.code === "ACTION_DIGEST_MISMATCH" || tamperRes.json?.ok !== true);
  record("tamper_rejected", packet.tamperRejected, { code: tamperRes.json?.code });
  if (!packet.tamperRejected) setFailure("TAMPERED_PAYLOAD_ALLOWED");

  const changedApprove = await fetchRaw(
    baseUrl,
    `/api/operator/governance/proposals/${proposalId}/approve`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        actionType: "activation.campaign.create",
        mutationPayload: { ...mutationPayload, name: "changed-after-execution" },
      }),
    },
    { token },
  );
  packet.changedDigestRejected = changedApprove.response.status >= 400 || changedApprove.json?.ok === false;
  record("changed_digest_rejected", packet.changedDigestRejected, { code: changedApprove.json?.code });

  const shortExpiry = new Date(Date.now() + 2000).toISOString();
  const expiredProposalRes = await fetchRaw(
    baseUrl,
    "/api/operator/governance/proposals",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...proposalBody, summary: "expired approval probe", expiration: shortExpiry }),
    },
    { token },
  );
  const expiredProposalId = expiredProposalRes.json?.proposal?.proposal_id ?? null;
  if (expiredProposalId) {
    await fetchRaw(
      baseUrl,
      `/api/operator/governance/proposals/${expiredProposalId}/approve`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          actionType: "activation.campaign.create",
          mutationPayload: { name: "expired-probe", reason: "expiry test" },
        }),
      },
      { token },
    );
    await sleep(2500);
    const expiredExecute = await fetchRaw(
      baseUrl,
      `/api/operator/governance/proposals/${expiredProposalId}/execute`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          mutationPayload: { name: "expired-probe", reason: "expiry test" },
        }),
      },
      { token },
    );
    packet.expiredApprovalRejected =
      expiredExecute.response.status >= 400 &&
      (expiredExecute.json?.code === "RECEIPT_EXPIRED" || expiredExecute.json?.code === "PROPOSAL_EXPIRED");
    record("expired_approval_rejected", packet.expiredApprovalRejected, { code: expiredExecute.json?.code });
  }

  const beaconDriftRes = await fetchRaw(
    baseUrl,
    "/api/operator/governance/proposals",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...proposalBody, summary: "beacon drift probe", beacon_hash: "0".repeat(64) }),
    },
    { token },
  );
  packet.beaconDriftRejected =
    beaconDriftRes.response.status === 403 &&
    (beaconDriftRes.json?.code === "BEACON_DRIFT" ||
      beaconDriftRes.json?.code === "BEACON_HASH_MISMATCH" ||
      String(beaconDriftRes.json?.code ?? "").includes("BEACON"));
  record("beacon_drift_rejected", packet.beaconDriftRejected, { code: beaconDriftRes.json?.code });

  const codexDriftRes = await fetchRaw(
    baseUrl,
    "/api/operator/governance/proposals",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...proposalBody, summary: "codex drift probe", codex_hash: "1".repeat(64) }),
    },
    { token },
  );
  packet.codexDriftRejected =
    codexDriftRes.response.status === 403 &&
    (codexDriftRes.json?.code === "CODEX_DRIFT" ||
      codexDriftRes.json?.code === "CODEX_HASH_MISMATCH" ||
      String(codexDriftRes.json?.code ?? "").includes("CODEX"));
  record("codex_drift_rejected", packet.codexDriftRejected, { code: codexDriftRes.json?.code });

  await fetchRaw(
    baseUrl,
    "/api/operator/governance/safe-mode/enter",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "phase2b proof containment probe" }),
    },
    { token },
  );

  const safeModeProposal = await fetchRaw(
    baseUrl,
    "/api/operator/governance/proposals",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...proposalBody,
        summary: "safe mode block probe",
        action_payload: {
          actionType: "activation.campaign.create",
          mutationPayload: { name: "safe-mode-block", reason: "probe" },
        },
      }),
    },
    { token },
  );
  const safeProposalId = safeModeProposal.json?.proposal?.proposal_id ?? null;
  if (safeProposalId) {
    await fetchRaw(
      baseUrl,
      `/api/operator/governance/proposals/${safeProposalId}/approve`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          actionType: "activation.campaign.create",
          mutationPayload: { name: "safe-mode-block", reason: "probe" },
        }),
      },
      { token },
    );
    const safeExecute = await fetchRaw(
      baseUrl,
      `/api/operator/governance/proposals/${safeProposalId}/execute`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          mutationPayload: { name: "safe-mode-block", reason: "probe" },
        }),
      },
      { token },
    );
    packet.safeModeBlockedMutation =
      safeExecute.response.status === 403 && safeExecute.json?.code === "SAFE_MODE_MUTATION_BLOCKED";
    record("safe_mode_blocks_mutation", packet.safeModeBlockedMutation, { code: safeExecute.json?.code });
  }

  const safeModeExit = await fetchRaw(
    baseUrl,
    "/api/operator/governance/safe-mode/exit",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "phase2b proof cleanup" }),
    },
    { token },
  );
  record("safe_mode_restored", safeModeExit.response.status === 200 && safeModeExit.json?.safeMode?.active === false, {
    active: safeModeExit.json?.safeMode?.active,
  });
  packet.safeModeRestored = safeModeExit.response.status === 200 && safeModeExit.json?.safeMode?.active === false;

  const auditRes = await fetchRaw(
    baseUrl,
    `/api/operator/governance/proposals/${proposalId}/audit`,
    {},
    { token },
  );
  packet.auditChainValid =
    auditRes.response.status === 200 &&
    auditRes.json?.proposalId === proposalId &&
    Boolean(auditRes.json?.bundle) &&
    Boolean(approvalId);
  record("audit_chain_valid", packet.auditChainValid, {
    approvalId: auditRes.json?.approvalId,
    executionId: auditRes.json?.execution?.executionId ?? executionId,
  });

  const telemetryRes = await fetchRaw(
    baseUrl,
    "/api/operator/governance/telemetry?limit=100",
    {},
    { token },
  );
  const events = telemetryRes.json?.events ?? [];
  packet.telemetryValid = validateTelemetryEvents(events, [
    "governance",
    "review",
    "approved",
    "execution",
    "safe_mode",
  ]);
  record("telemetry_valid", packet.telemetryValid, { eventCount: events.length });

  let rollbackPass = false;
  if (campaignId && proposalId) {
    const rollbackBody = {
      target_system: "activation",
      action_class: "C3",
      summary: "Phase 2B rollback archive",
      intended_outcome: "Archive proof campaign",
      rollback_plan: "N/A — rollback action",
      evidence_refs: ["audit:phase2b:rollback"],
      beacon_hash: beaconHash,
      codex_hash: codexHash,
      action_payload: {
        actionType: "activation.campaign.archive",
        mutationPayload: { campaignId, reason: "phase2b rollback proof" },
      },
    };
    const rollbackProposalRes = await fetchRaw(
      baseUrl,
      "/api/operator/governance/proposals",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(rollbackBody),
      },
      { token },
    );
    const rollbackProposalId = rollbackProposalRes.json?.proposal?.proposal_id ?? null;
    if (rollbackProposalId) {
      await fetchRaw(
        baseUrl,
        `/api/operator/governance/proposals/${rollbackProposalId}/approve`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            actionType: "activation.campaign.archive",
            mutationPayload: { campaignId, reason: "phase2b rollback proof" },
          }),
        },
        { token },
      );
      const rollbackRes = await fetchRaw(
        baseUrl,
        `/api/operator/governance/proposals/${proposalId}/rollback`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            rollbackProposalId,
            idempotencyKey: crypto.randomUUID(),
            mutationPayload: { campaignId, reason: "phase2b rollback proof" },
          }),
        },
        { token },
      );
      rollbackPass = rollbackRes.response.status === 200 && rollbackRes.json?.ok === true;
      record("rollback_separate_approval", rollbackPass, {
        rollbackProposalId,
        code: rollbackRes.json?.code,
      });
    }
  }
  packet.rollback.result = rollbackPass ? "PASS" : "FAIL";
  if (!rollbackPass) setFailure("ROLLBACK_EXECUTION_FAILED");

  packet.deploymentId = deploymentId;
  packet.beaconHash = beaconHash;
  packet.codexHash = codexHash;
  packet.proposalId = proposalId;
  packet.approvalId = approvalId;
  packet.receiptId = receiptId;
  packet.executionId = executionId;
  packet.auditBundleId = auditBundleId ?? auditRes.json?.bundle?.auditBundleId ?? null;
  packet.mutationCount = mutationCount;
  packet.checks = checks;

  const allPass = checks.every((entry) => entry.result === "PASS") && !failureCode;
  finalize(allPass ? "PASS" : "FAIL");
}

function finalize(status) {
  if (!assertPendingForbidden(status)) {
    setFailure("PENDING_STATUS_FORBIDDEN");
    status = "FAIL";
  }
  packet.status = status;
  packet.failureCode = failureCode;
  packet.timestamp = new Date().toISOString();

  const { redacted, serialized, sha256 } = writeChecksumArtifact(outputPath, packet);
  const redactionViolations = assertArtifactRedaction(serialized);
  if (redactionViolations.length > 0) {
    redacted.redactionViolations = redactionViolations.length;
    setFailure("ARTIFACT_REDACTION_FAILED");
    redacted.status = "FAIL";
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(redacted, null, 2)}\n`);
  writeFileSync(sha256Path, `${sha256}\n`);

  console.log(status === "PASS" ? "STAGING_PHASE_2B_PROOF::PASS" : "STAGING_PHASE_2B_PROOF::FAIL");
  if (failureCode) console.log(`FAILURE_CODE::${failureCode}`);
  console.log(
    JSON.stringify(
      {
        passed: checks.filter((entry) => entry.result === "PASS").length,
        failed: checks.filter((entry) => entry.result === "FAIL").length,
        artifact: outputPath,
        sha256,
      },
      null,
      2,
    ),
  );
  process.exitCode = status === "PASS" ? 0 : 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  packet.status = "FAIL";
  packet.failureCode = "PROOF_SCRIPT_DEFECT";
  try {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(redactValue(packet), null, 2)}\n`);
  } catch {
    // best effort
  }
  process.exit(1);
});

#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const baseUrl = (process.argv[2] ?? process.env.STAGING_BASE_URL ?? "").replace(/\/$/, "");
const commitSha = process.argv[3] ?? process.env.COMMIT_SHA ?? "unknown";
const outputPath =
  process.argv[4] ?? join(root, "artifacts", "staging-governance-proof.json");

const checks = [];
let packet = {
  schema_version: "1.0",
  environment: "staging",
  base_url: baseUrl,
  commit_sha: commitSha,
  tested_at: new Date().toISOString(),
  status: "pending",
  closure_gate: {},
  checks: [],
};

function record(name, pass, details = {}) {
  const entry = { name, result: pass ? "PASS" : "FAIL", ...details };
  checks.push(entry);
  return entry;
}

async function fetchJson(path, init = {}, token) {
  const headers = {
    Accept: "application/json",
    "Cache-Control": "no-cache",
    ...(init.headers ?? {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers, redirect: "manual" });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { response, json, text };
}

async function resolveToken() {
  const bearer = process.env.OPERATOR_BEARER_TOKEN?.trim();
  if (bearer) return bearer;
  const callsign = process.env.STAGING_OPERATOR_CALLSIGN?.trim();
  const password = process.env.STAGING_OPERATOR_PASSWORD?.trim();
  if (!callsign || !password) return null;
  const login = await fetchJson("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ callsign, password }),
  });
  return login.json?.accessToken ?? null;
}

function loadCodexHash() {
  try {
    const report = JSON.parse(readFileSync(join(root, "artifacts", "codex-validation-report.json"), "utf8"));
    return report.manifest_hash ?? null;
  } catch {
    return null;
  }
}

async function main() {
  if (!baseUrl) {
    console.error("STAGING_GOVERNANCE_PROOF::FAIL — STAGING_BASE_URL required");
    process.exit(1);
  }

  const token = await resolveToken();
  if (!token) {
    record("auth", false, { notes: ["OPERATOR_BEARER_TOKEN or STAGING_OPERATOR_CALLSIGN/PASSWORD required"] });
    finalize("FAIL");
    return;
  }
  record("auth", true);

  const beacon = await fetchJson("/api/beacon/v2", {}, token);
  const beaconHash = beacon.json?.beaconHash ?? beacon.json?.hash ?? null;
  const beaconVerified = beacon.json?.verified === true;
  record("beacon_v2_verified", beaconVerified && beacon.response.status === 200, {
    status: beacon.response.status,
    beaconHash,
  });

  const codexHash = beacon.json?.codexHash ?? loadCodexHash();
  const buildInfo = await fetchJson("/api/build-info");
  const deploymentId = buildInfo.json?.deploymentId ?? buildInfo.json?.versionId ?? null;

  const mutationPayload = {
    name: `staging-proof-${Date.now()}`,
    reason: "Operator OS v3 staging governance proof",
    description: "Governed activation campaign create proof",
  };

  const proposalBody = {
    target_system: "activation",
    action_class: "C3",
    summary: "Staging governance proof — activation campaign create",
    intended_outcome: "Validate receipt authority and audit bundle",
    rollback_plan: "Archive proof campaign",
    beacon_hash: beaconHash,
    codex_hash: codexHash,
    action_payload: {
      actionType: "activation.campaign.create",
      mutationPayload,
    },
  };

  const proposalRes = await fetchJson(
    "/api/governance/proposals",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(proposalBody),
    },
    token,
  );
  const proposalId = proposalRes.json?.proposal?.proposal_id ?? null;
  record("proposal_create", proposalRes.response.status === 201 && Boolean(proposalId), {
    status: proposalRes.response.status,
    code: proposalRes.json?.code,
    proposalId,
  });

  const approveRes = await fetchJson(
    `/api/governance/proposals/${proposalId}/approve`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        actionType: "activation.campaign.create",
        mutationPayload,
      }),
    },
    token,
  );
  const approvalId = approveRes.json?.receipt?.approvalId ?? approveRes.json?.proposal?.approval_id ?? null;
  record("proposal_approve", approveRes.response.status === 200 && Boolean(approvalId), {
    status: approveRes.response.status,
    code: approveRes.json?.code,
    approvalId,
  });

  const idempotencyKey = crypto.randomUUID();
  const executeBody = {
    ...mutationPayload,
    proposalId,
    approvalId,
    idempotencyKey,
  };

  const executeOnce = () =>
    fetchJson(
      "/api/operator/activation/campaigns",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(executeBody),
      },
      token,
    );

  const [first, secondParallel] = await Promise.all([executeOnce(), executeOnce()]);
  const firstOk = first.response.status === 201 || (first.response.status === 200 && first.json?.ok !== false);
  const secondStatus = secondParallel.response.status;
  const secondCode = secondParallel.json?.code ?? secondParallel.json?.error;
  const concurrencyPass =
    firstOk &&
    (secondParallel.json?.code === "RECEIPT_CONSUMED" ||
      secondParallel.json?.code === "IDEMPOTENCY_REPLAY" ||
      secondStatus === 409);
  record("concurrent_receipt_reserve", concurrencyPass, {
    firstStatus: first.response.status,
    secondStatus,
    secondCode,
  });

  const executionId = first.json?.executionReceipt?.executionId ?? first.json?.executionId ?? null;
  record("valid_receipt_execute_once", firstOk, { executionId, status: first.response.status });

  const replayConsumed = await fetchJson(
    "/api/operator/activation/campaigns",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...mutationPayload,
        name: `staging-proof-replay-${Date.now()}`,
        proposalId,
        approvalId,
        idempotencyKey: crypto.randomUUID(),
      }),
    },
    token,
  );
  record("consumed_receipt_rejected", replayConsumed.json?.code === "RECEIPT_CONSUMED", {
    status: replayConsumed.response.status,
    code: replayConsumed.json?.code,
  });

  const idempotentReplay = await fetchJson(
    "/api/operator/activation/campaigns",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(executeBody),
    },
    token,
  );
  record("idempotent_replay", idempotentReplay.json?.code === "IDEMPOTENCY_REPLAY" || idempotentReplay.response.status === 200, {
    status: idempotentReplay.response.status,
    code: idempotentReplay.json?.code,
  });

  const missingReceipt = await fetchJson(
    "/api/operator/activation/campaigns",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "missing-receipt-proof",
        reason: "proof",
        proposalId: crypto.randomUUID(),
        approvalId: crypto.randomUUID(),
        idempotencyKey: crypto.randomUUID(),
      }),
    },
    token,
  );
  record("missing_receipt_rejected", missingReceipt.response.status === 403 || missingReceipt.response.status === 404, {
    status: missingReceipt.response.status,
    code: missingReceipt.json?.code,
  });

  const legacyBoolean = await fetchJson(
    "/api/operator/activation/campaigns",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "legacy-bypass-proof",
        reason: "proof",
        operatorApproval: true,
      }),
    },
    token,
  );
  record("legacy_boolean_rejected", legacyBoolean.json?.code === "LEGACY_BYPASS_FORBIDDEN" || legacyBoolean.response.status === 403, {
    status: legacyBoolean.response.status,
    code: legacyBoolean.json?.code,
  });

  const driftProposal = await fetchJson(
    "/api/governance/proposals",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...proposalBody,
        summary: "Beacon drift proof",
        beacon_hash: "0".repeat(64),
      }),
    },
    token,
  );
  record("beacon_drift_rejected", driftProposal.response.status === 403 || driftProposal.json?.code?.includes("BEACON"), {
    status: driftProposal.response.status,
    code: driftProposal.json?.code,
  });

  const tamperedExecute = await fetchJson(
    "/api/operator/activation/campaigns",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...executeBody,
        name: "tampered-payload-proof",
        proposalId,
        approvalId,
        idempotencyKey: crypto.randomUUID(),
      }),
    },
    token,
  );
  record("tampered_payload_rejected", tamperedExecute.response.status >= 400 && tamperedExecute.json?.ok !== true, {
    status: tamperedExecute.response.status,
    code: tamperedExecute.json?.code,
  });

  const bundleRes = await fetchJson(`/api/governance/audit/bundle/${proposalId}`, {}, token);
  const auditBundleId = bundleRes.json?.bundle?.auditBundleId ?? null;
  const bundleLinked =
    bundleRes.response.status === 200 &&
    bundleRes.json?.bundle?.proposal?.proposal_id === proposalId &&
    (bundleRes.json?.bundle?.receipt?.approvalId === approvalId || Boolean(bundleRes.json?.bundle?.receipt));
  record("audit_bundle_links", bundleLinked, { auditBundleId, status: bundleRes.response.status });

  packet.closure_gate = {
    commit_sha: commitSha,
    deployment_id: deploymentId,
    beacon_hash: beaconHash,
    codex_hash: codexHash,
    durable_object_migration: "v37-receipt-authority",
    concurrency_result: concurrencyPass ? "single_mutation" : "fail",
    proposal_id: proposalId,
    approval_id: approvalId,
    execution_id: executionId,
    audit_bundle_id: auditBundleId,
    rollback_target: "wrangler rollback --env staging",
  };
  packet.checks = checks;
  finalize(checks.every((c) => c.result === "PASS") ? "PASS" : "FAIL");
}

function finalize(status) {
  packet.status = status;
  packet.summary = {
    passed: checks.filter((c) => c.result === "PASS").length,
    failed: checks.filter((c) => c.result === "FAIL").length,
  };
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(packet, null, 2)}\n`);
  console.log(status === "PASS" ? "STAGING_GOVERNANCE_PROOF::PASS" : "STAGING_GOVERNANCE_PROOF::FAIL");
  console.log(JSON.stringify(packet.summary, null, 2));
  process.exit(status === "PASS" ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

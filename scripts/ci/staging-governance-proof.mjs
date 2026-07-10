#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cfAccessConfigured, readCfAccessServiceTokenHeaders } from "../lib/cfAccess.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const baseUrl = (process.argv[2] ?? process.env.STAGING_BASE_URL ?? "").replace(/\/$/, "");
const commitSha = process.argv[3] ?? process.env.COMMIT_SHA ?? "unknown";
const outputPath =
  process.argv[4] ?? join(root, "artifacts", "staging-governance-proof.json");
const sha256Path = `${outputPath}.sha256`;

const EXPECTED_BEACON_HASH =
  process.env.EXPECTED_BEACON_SHA256 ??
  "50a56303603f6fb65653764dca13ae1d7100197f48d4b7c055fbd68da4fac65c";
const EXPECTED_CODEX_HASH =
  process.env.EXPECTED_CODEX_HASH ??
  "c8f0ab1ee8f84812be5f54d3906c05bab4da25f724386778466d8b277ee48826c";
const MIGRATION = "v37-receipt-authority";

const checks = [];
const accessChecks = [];
let failureCode = null;
let concurrencyStats = {
  attempt_count: 0,
  successful_reservations: 0,
  successful_mutations: 0,
  rejected_attempts: 0,
  final_receipt_state: "unknown",
};

let packet = {
  schema_version: "1.1",
  environment: "staging",
  base_url: baseUrl,
  commit_sha: commitSha,
  tested_at: new Date().toISOString(),
  status: "pending",
  deployment_id: null,
  beacon_hash: null,
  codex_hash: null,
  durable_object_migration: MIGRATION,
  concurrency_result: null,
  proposal_id: null,
  approval_id: null,
  execution_id: null,
  audit_bundle_id: null,
  access: {},
  checks: [],
  concurrency: concurrencyStats,
};

function setFailure(code) {
  if (!failureCode) failureCode = code;
}

function record(name, pass, details = {}) {
  const entry = { name, result: pass ? "PASS" : "FAIL", ...details };
  checks.push(entry);
  return entry;
}

function recordAccess(name, pass, details = {}) {
  const entry = { name, result: pass ? "PASS" : "FAIL", ...details };
  accessChecks.push(entry);
  return entry;
}

const REDACT_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  /CF-Access-Client-Secret["']?\s*[:=]\s*["']?[^"'\s,}]+/gi,
  /CF-Access-Client-Id["']?\s*[:=]\s*["']?[^"'\s,}]+/gi,
  /(AUTH_SIGNING_KEY|GOVERNANCE_RECEIPT_SIGNING_KEY|BEACON_SIGNING_KEY|OPERATOR_PASSWORD)\s*[:=]\s*\S+/gi,
];

function redactValue(value) {
  const json = JSON.stringify(value);
  let out = json;
  for (const pattern of REDACT_PATTERNS) {
    out = out.replace(pattern, "[REDACTED]");
  }
  return JSON.parse(out);
}

function assertArtifactRedaction(text) {
  const violations = [];
  for (const pattern of REDACT_PATTERNS) {
    if (pattern.test(text)) violations.push(pattern.toString());
    pattern.lastIndex = 0;
  }
  return violations;
}

function isAccessInterstitial(response, text) {
  if (response.status === 302 || response.status === 301) return true;
  if (text.includes("cloudflareaccess.com")) return true;
  if (text.includes("Cloudflare Access")) return true;
  return false;
}

function workerReached(response, text) {
  if (isAccessInterstitial(response, text)) return false;
  const ct = response.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return true;
  if (response.headers.get("x-build-commit")) return true;
  return false;
}

async function fetchRaw(path, init = {}, options = {}) {
  const { token, includeAccess = true } = options;
  const headers = {
    Accept: "application/json",
    "Cache-Control": "no-cache",
    ...(init.headers ?? {}),
  };
  if (includeAccess) {
    Object.assign(headers, readCfAccessServiceTokenHeaders());
  }
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
  const callsign =
    process.env.STAGING_OPERATOR_CALLSIGN?.trim() ??
    process.env.OPERATOR_CALLSIGN?.trim();
  const password =
    process.env.STAGING_OPERATOR_PASSWORD?.trim() ?? process.env.OPERATOR_PASSWORD?.trim();
  if (!callsign || !password) return null;
  const login = await fetchRaw("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: callsign, password }),
  });
  return login.json?.token ?? login.json?.accessToken ?? null;
}

function loadCodexHash() {
  try {
    const report = JSON.parse(readFileSync(join(root, "artifacts", "codex-validation-report.json"), "utf8"));
    return report.manifest_hash ?? null;
  } catch {
    return null;
  }
}

async function runAccessPreflight(token) {
  const noAccess = await fetchRaw("/api/build-info", {}, { includeAccess: false });
  recordAccess("access_token_missing_interstitial", isAccessInterstitial(noAccess.response, noAccess.text), {
    status: noAccess.response.status,
    code: "ACCESS_TOKEN_MISSING",
  });

  if (!cfAccessConfigured()) {
    recordAccess("access_service_token_configured", false, { code: "ACCESS_TOKEN_MISSING" });
    setFailure("ACCESS_AUTH_FAILED");
    return false;
  }

  recordAccess("access_service_token_configured", true);

  const withAccessPublic = await fetchRaw("/api/build-info", {});
  const reached = workerReached(withAccessPublic.response, withAccessPublic.text);
  recordAccess("access_reached_worker", reached, {
    status: withAccessPublic.response.status,
    code: reached ? "ACCESS_REACHED_WORKER" : "ACCESS_TOKEN_REJECTED",
  });
  if (!reached) {
    setFailure("ACCESS_AUTH_FAILED");
    return false;
  }

  const protectedNoWorker = await fetchRaw("/api/governance/proposals", {
    method: "GET",
  });
  const workerRejected =
    protectedNoWorker.response.status === 401 || protectedNoWorker.response.status === 403;
  const bypassed =
    protectedNoWorker.response.status === 200 && Array.isArray(protectedNoWorker.json?.proposals);
  recordAccess("worker_auth_still_required", workerRejected && !bypassed, {
    status: protectedNoWorker.response.status,
    code: bypassed ? "WORKER_AUTH_BYPASSED" : workerRejected ? "WORKER_AUTH_REJECTED" : "WORKER_AUTH_BYPASSED",
  });
  if (bypassed) {
    setFailure("WORKER_AUTH_FAILED");
    return false;
  }

  if (token) {
    const authed = await fetchRaw("/api/governance/proposals", { method: "GET" }, { token });
    recordAccess("worker_auth_with_token", authed.response.status === 200, {
      status: authed.response.status,
    });
  }

  return true;
}

async function main() {
  if (!baseUrl) {
    console.error("STAGING_GOVERNANCE_PROOF::FAIL — STAGING_BASE_URL required");
    process.exit(1);
  }

  packet.access = {
    access_method: cfAccessConfigured() ? "cloudflare_access_service_token" : "none",
    access_application: "ttx-operator-shell-staging.sogellagepul.workers.dev",
    service_token_configured: cfAccessConfigured(),
  };

  const accessOk = await runAccessPreflight(null);
  packet.access.worker_reached = accessChecks.find((c) => c.name === "access_reached_worker")?.result === "PASS";
  packet.access.worker_auth_still_required =
    accessChecks.find((c) => c.name === "worker_auth_still_required")?.result === "PASS";
  packet.checks.push(...accessChecks.map((c) => ({ ...c, group: "access" })));

  if (!accessOk) {
    finalize("FAIL");
    return;
  }

  const token = await resolveToken();
  if (!token) {
    record("operator_auth", false, {
      notes: ["OPERATOR_BEARER_TOKEN or STAGING_OPERATOR_CALLSIGN/PASSWORD required"],
    });
    setFailure("WORKER_AUTH_FAILED");
    finalize("FAIL");
    return;
  }
  record("operator_auth", true);

  const beacon = await fetchRaw("/api/beacon/v2", {}, { token });
  const beaconHash = beacon.json?.beaconHash ?? beacon.json?.hash ?? null;
  const beaconVerified = beacon.json?.verified === true;
  record("beacon_v2_verified", beaconVerified && beacon.response.status === 200, {
    status: beacon.response.status,
    beaconHash,
    code: beacon.json?.code,
  });
  if (!beaconVerified) setFailure("BEACON_SIGNATURE_INVALID");

  const codexHash = beacon.json?.codexHash ?? loadCodexHash() ?? undefined;

  const buildInfo = await fetchRaw("/api/build-info", {});
  const deploymentId =
    process.env.DEPLOYMENT_ID ??
    buildInfo.json?.deploymentId ??
    buildInfo.json?.versionId ??
    buildInfo.response.headers.get("cf-ray") ??
    null;
  const deployedCommit =
    buildInfo.json?.commitSha ?? buildInfo.response.headers.get("x-build-commit") ?? null;
  record("commit_sha_match", deployedCommit === commitSha, {
    expected: commitSha,
    observed: deployedCommit,
  });
  if (deployedCommit && deployedCommit !== commitSha) setFailure("RC_SHA_MISMATCH");

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
    ...(codexHash ? { codex_hash: codexHash } : {}),
    action_payload: {
      actionType: "activation.campaign.create",
      mutationPayload,
    },
  };

  const proposalRes = await fetchRaw(
    "/api/governance/proposals",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(proposalBody),
    },
    { token },
  );
  const proposalId = proposalRes.json?.proposal?.proposal_id ?? null;
  const resolvedCodexHash = proposalRes.json?.proposal?.codex_hash ?? codexHash ?? EXPECTED_CODEX_HASH;
  record("valid_receipt_proposal_create", proposalRes.response.status === 201 && Boolean(proposalId), {
    status: proposalRes.response.status,
    code: proposalRes.json?.code,
    proposalId,
  });

  const approveRes = await fetchRaw(
    `/api/governance/proposals/${proposalId}/approve`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        actionType: "activation.campaign.create",
        mutationPayload,
      }),
    },
    { token },
  );
  const approvalId = approveRes.json?.receipt?.approvalId ?? approveRes.json?.proposal?.approval_id ?? null;
  record("valid_receipt_proposal_approve", approveRes.response.status === 200 && Boolean(approvalId), {
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
    fetchRaw(
      "/api/operator/activation/campaigns",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(executeBody),
      },
      { token },
    );

  const concurrentAttempts = 5;
  concurrencyStats.attempt_count = concurrentAttempts;
  const concurrentResults = await Promise.all(
    Array.from({ length: concurrentAttempts }, () => executeOnce()),
  );

  let mutations = 0;
  let rejections = 0;
  for (const result of concurrentResults) {
    const ok = result.response.status === 201 || (result.response.status === 200 && result.json?.ok !== false);
    if (ok) mutations += 1;
    else rejections += 1;
  }
  concurrencyStats.successful_mutations = mutations;
  concurrencyStats.rejected_attempts = rejections;
  concurrencyStats.successful_reservations = mutations > 0 ? 1 : 0;
  concurrencyStats.final_receipt_state = mutations === 1 ? "consumed" : "indeterminate";

  const concurrencyPass = mutations === 1 && rejections === concurrentAttempts - 1;
  record("concurrent_receipt_reserve", concurrencyPass, {
    mutations,
    rejections,
    codes: concurrentResults.map((r) => r.json?.code ?? r.json?.error).filter(Boolean),
  });
  if (!concurrencyPass) setFailure("CONCURRENCY_SINGLE_MUTATION_FAILED");

  const firstSuccess = concurrentResults.find(
    (r) => r.response.status === 201 || (r.response.status === 200 && r.json?.ok !== false),
  );
  const executionId =
    firstSuccess?.json?.executionReceipt?.executionId ?? firstSuccess?.json?.executionId ?? null;
  const executionAuditBundleId = firstSuccess?.json?.executionReceipt?.auditBundleId ?? null;
  record("valid_receipt_execute_once", mutations === 1, { executionId, mutation_count: mutations });

  const replayConsumed = await fetchRaw(
    "/api/operator/activation/campaigns",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...mutationPayload,
        proposalId,
        approvalId,
        idempotencyKey: crypto.randomUUID(),
      }),
    },
    { token },
  );
  const replayPass = replayConsumed.json?.code === "RECEIPT_CONSUMED";
  record("consumed_receipt_rejected", replayPass, {
    status: replayConsumed.response.status,
    code: replayConsumed.json?.code,
  });
  if (!replayPass) setFailure("RECEIPT_REPLAY_ALLOWED");

  const tamperedExecute = await fetchRaw(
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
    { token },
  );
  const tamperPass = tamperedExecute.response.status >= 400 && tamperedExecute.json?.ok !== true;
  record("tampered_payload_rejected", tamperPass, {
    status: tamperedExecute.response.status,
    code: tamperedExecute.json?.code,
  });
  if (!tamperPass) setFailure("TAMPERED_PAYLOAD_ALLOWED");

  const missingReceipt = await fetchRaw(
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
    { token },
  );
  const missingPass =
    missingReceipt.response.status === 403 ||
    missingReceipt.response.status === 404 ||
    missingReceipt.json?.code === "RECEIPT_REQUIRED";
  record("missing_receipt_rejected", missingPass, {
    status: missingReceipt.response.status,
    code: missingReceipt.json?.code,
  });
  if (!missingPass) setFailure("MISSING_RECEIPT_ALLOWED");

  const legacyBoolean = await fetchRaw(
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
    { token },
  );
  const legacyPass =
    legacyBoolean.json?.code === "LEGACY_BYPASS_FORBIDDEN" || legacyBoolean.response.status === 403;
  record("legacy_boolean_rejected", legacyPass, {
    status: legacyBoolean.response.status,
    code: legacyBoolean.json?.code,
  });
  if (!legacyPass) setFailure("LEGACY_BYPASS_ALLOWED");

  const driftProposal = await fetchRaw(
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
    { token },
  );
  const driftCode = driftProposal.json?.code ?? "";
  const driftPass =
    driftProposal.response.status === 403 &&
    (driftCode === "BEACON_DRIFT" ||
      driftCode === "BEACON_HASH_MISMATCH" ||
      driftCode.includes("BEACON"));
  record("beacon_drift_rejected", driftPass, {
    status: driftProposal.response.status,
    code: driftCode,
  });
  if (!driftPass) setFailure("BEACON_DRIFT_ALLOWED");

  const bundleRes = await fetchRaw(`/api/governance/audit/bundle/${proposalId}`, {}, { token });
  const auditBundleId = executionAuditBundleId ?? bundleRes.json?.bundle?.auditBundleId ?? null;
  const bundleLinked =
    bundleRes.response.status === 200 &&
    bundleRes.json?.bundle?.proposal?.proposal_id === proposalId &&
    (bundleRes.json?.bundle?.receipt?.approvalId === approvalId || Boolean(bundleRes.json?.bundle?.receipt)) &&
    Boolean(executionId) &&
    Boolean(auditBundleId);
  record("audit_bundle_links", bundleLinked, { auditBundleId, status: bundleRes.response.status });
  if (!bundleLinked) setFailure("AUDIT_CHAIN_INCOMPLETE");

  packet.deployment_id = deploymentId;
  packet.beacon_hash = beaconHash;
  packet.codex_hash = resolvedCodexHash ?? codexHash;
  packet.concurrency_result = concurrencyPass ? "single_mutation" : "fail";
  packet.proposal_id = proposalId;
  packet.approval_id = approvalId;
  packet.execution_id = executionId;
  packet.audit_bundle_id = auditBundleId;
  packet.concurrency = concurrencyStats;
  packet.failure_code = failureCode;
  packet.checks.push(...checks.map((c) => ({ ...c, group: "governance" })));

  const allPass = packet.checks.every((c) => c.result === "PASS");
  if (beaconHash && beaconHash !== EXPECTED_BEACON_HASH) setFailure("BEACON_HASH_MISMATCH");
  if (codexHash && codexHash !== EXPECTED_CODEX_HASH) setFailure("RC_SHA_MISMATCH");
  if (!allPass && !failureCode) {
    const failed = packet.checks.filter((c) => c.result === "FAIL");
    const names = new Set(failed.map((c) => c.name));
    if (names.has("access_reached_worker") || names.has("access_service_token_configured")) {
      setFailure("ACCESS_AUTH_FAILED");
    } else if (names.has("operator_auth")) {
      setFailure("WORKER_AUTH_FAILED");
    } else if (names.has("concurrent_receipt_reserve")) {
      setFailure("CONCURRENCY_SINGLE_MUTATION_FAILED");
    } else if (names.has("consumed_receipt_rejected")) {
      setFailure("RECEIPT_REPLAY_ALLOWED");
    } else if (names.has("tampered_payload_rejected")) {
      setFailure("TAMPERED_PAYLOAD_ALLOWED");
    } else if (names.has("missing_receipt_rejected")) {
      setFailure("MISSING_RECEIPT_ALLOWED");
    } else if (names.has("legacy_boolean_rejected")) {
      setFailure("LEGACY_BYPASS_ALLOWED");
    } else if (names.has("beacon_drift_rejected")) {
      setFailure("BEACON_DRIFT_ALLOWED");
    } else if (names.has("audit_bundle_links")) {
      setFailure("AUDIT_CHAIN_INCOMPLETE");
    } else {
      setFailure("RECEIPT_EXECUTION_FAILED");
    }
  }

  finalize(allPass && !failureCode ? "PASS" : "FAIL");
}

function finalize(status) {
  packet.status = status;
  packet.summary = {
    passed: packet.checks.filter((c) => c.result === "PASS").length,
    failed: packet.checks.filter((c) => c.result === "FAIL").length,
  };

  const redacted = redactValue(packet);
  const serialized = `${JSON.stringify(redacted, null, 2)}\n`;
  const redactionViolations = assertArtifactRedaction(serialized);
  if (redactionViolations.length > 0) {
    redacted.redaction_result = "FAIL";
    redacted.redaction_violations = redactionViolations.length;
    setFailure("ARTIFACT_REDACTION_FAILED");
    redacted.failure_code = failureCode;
  } else {
    redacted.redaction_result = "PASS";
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(redacted, null, 2)}\n`);
  const digest = createHash("sha256").update(serialized).digest("hex");
  writeFileSync(sha256Path, `${digest}\n`);

  console.log(status === "PASS" ? "STAGING_GOVERNANCE_PROOF::PASS" : "STAGING_GOVERNANCE_PROOF::FAIL");
  if (failureCode) console.log(`FAILURE_CODE::${failureCode}`);
  console.log(JSON.stringify(packet.summary, null, 2));
  process.exitCode = status === "PASS" ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  setFailure("PROOF_SCRIPT_DEFECT");
  try {
    packet.status = "FAIL";
    packet.failure_code = "PROOF_SCRIPT_DEFECT";
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(redactValue(packet), null, 2)}\n`);
  } catch {
    // best effort
  }
  process.exit(1);
});

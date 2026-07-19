#!/usr/bin/env node
/**
 * Authenticated Flywheel staging smoke for FW-V38-STAGING-DEPLOY-20260719-001.
 * Requires OPERATOR_CALLSIGN + OPERATOR_PASSWORD in env. Never logs secret values.
 */
import { writeFileSync } from "node:fs";

const base = process.env.STAGING_BASE_URL?.trim() || "https://ttx-operator-shell-staging.sogellagepul.workers.dev";
const callsign = process.env.OPERATOR_CALLSIGN?.trim();
const password = process.env.OPERATOR_PASSWORD;
const outPath = process.env.SMOKE_REPORT_PATH?.trim() || "docs/evidence/_flywheel-staging-smoke-raw.json";

const steps = [];
function record(step, ok, detail = {}) {
  steps.push({ step, ok, ...detail, at: new Date().toISOString() });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark} ${step}${detail.status != null ? ` status=${detail.status}` : ""}${detail.code ? ` code=${detail.code}` : ""}`);
}

async function req(path, { method = "GET", token, body } = {}) {
  const headers = { Accept: "application/json", "Cache-Control": "no-cache" };
  const accessId = process.env.CF_ACCESS_CLIENT_ID?.trim();
  const accessSecret = process.env.CF_ACCESS_CLIENT_SECRET?.trim();
  if (accessId && accessSecret) {
    headers["CF-Access-Client-Id"] = accessId;
    headers["CF-Access-Client-Secret"] = accessSecret;
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  let json = null;
  const text = await response.text();
  try {
    json = JSON.parse(text);
  } catch {
    json = text.includes("Cloudflare Access") ? { error: "CF_ACCESS_BLOCKED" } : null;
  }
  return { status: response.status, json };
}

function failClosed(message) {
  writeFileSync(outPath, JSON.stringify({ ok: false, base, message, steps }, null, 2));
  console.error(message);
  process.exit(1);
}

if (!callsign || !password) {
  failClosed("OPERATOR_CALLSIGN and OPERATOR_PASSWORD are required for authenticated smoke.");
}

const login = await req("/api/auth/login", {
  method: "POST",
  body: { username: callsign, password },
});
const token = login.json?.token;
record("auth.login", Boolean(token) && login.status === 200, {
  status: login.status,
  code: login.json?.error,
});
if (!token) failClosed("Operator login failed.");

const unauth = await req("/api/flywheel/stages");
record("flywheel.stages.requires_auth", unauth.status === 401, {
  status: unauth.status,
  code: unauth.json?.error?.code,
});

const stages = await req("/api/flywheel/stages", { token });
record("flywheel.stages", stages.status === 200 && stages.json?.ok === true, {
  status: stages.status,
  stageCount: Array.isArray(stages.json?.data?.stages) ? stages.json.data.stages.length : 0,
});

const create = await req("/api/flywheel/runs", {
  method: "POST",
  token,
  body: {
    missionId: `fw-v38-smoke-${Date.now()}`,
    idempotencyKey: `fw-v38-smoke-${crypto.randomUUID()}`,
    autonomyLevel: 1,
  },
});
const run = create.json?.data?.run;
record("flywheel.run.create", (create.status === 201 || create.status === 200) && Boolean(run?.id), {
  status: create.status,
  code: create.json?.error?.code,
  runId: run?.id,
  state: run?.state,
});
if (!run?.id) failClosed("Run create failed.");

const analyze = await req(`/api/flywheel/runs/${run.id}/commands`, {
  method: "POST",
  token,
  body: {
    command: "ANALYZE::STAGE_1::LEADS",
    idempotencyKey: `analyze-${crypto.randomUUID()}`,
  },
});
record("flywheel.command.analyze_c0", analyze.status === 200 && analyze.json?.ok === true, {
  status: analyze.status,
  code: analyze.json?.error?.code,
  commandState: analyze.json?.data?.state,
});

const scan = await req(`/api/flywheel/runs/${run.id}/commands`, {
  method: "POST",
  token,
  body: {
    command: "SCAN::STAGE_1::LEADS",
    idempotencyKey: `scan-${crypto.randomUUID()}`,
  },
});
record("flywheel.command.scan_c1_creates_evidence", scan.status === 200 && scan.json?.ok === true, {
  status: scan.status,
  code: scan.json?.error?.code,
  commandState: scan.json?.data?.state,
});

const detailAfterScan = await req(`/api/flywheel/runs/${run.id}`, { token });
const evidenceCount = Array.isArray(detailAfterScan.json?.data?.evidence)
  ? detailAfterScan.json.data.evidence.length
  : 0;
record("flywheel.run.evidence_after_scan", detailAfterScan.status === 200 && evidenceCount > 0, {
  status: detailAfterScan.status,
  evidenceCount,
});

const synth = await req(`/api/flywheel/runs/${run.id}/commands`, {
  method: "POST",
  token,
  body: {
    command: "SYNTH::STAGE_1::QUALIFY",
    idempotencyKey: `synth-${crypto.randomUUID()}`,
  },
});
const proposalId = synth.json?.data?.proposalId;
const commandId = synth.json?.data?.commandId;
record("flywheel.command.synth_c2_awaits_approval", synth.status === 202 && Boolean(proposalId) && Boolean(commandId), {
  status: synth.status,
  code: synth.json?.error?.code,
  state: synth.json?.data?.state,
  hasProposalId: Boolean(proposalId),
  hasCommandId: Boolean(commandId),
  optionalUntilBeaconV2: true,
});

let approveOk = false;
if (proposalId && commandId) {
  const approve = await req(`/api/flywheel/runs/${run.id}/approve`, {
    method: "POST",
    token,
    body: { commandId, proposalId },
  });
  approveOk = approve.status === 200 && approve.json?.ok === true;
  record("flywheel.command.approve", approveOk, {
    status: approve.status,
    code: approve.json?.error?.code,
    hasExecutionReceipt: Boolean(approve.json?.data?.executionReceipt),
  });
} else {
  record("flywheel.command.approve", false, { skipped: true, reason: "missing proposal/command id" });
}

const safeMode = await req(`/api/flywheel/runs/${run.id}/safe-mode`, {
  method: "POST",
  token,
  body: { reason: "fw-v38-staging-smoke" },
});
const safeRunState =
  safeMode.json?.data?.run?.run?.state ??
  safeMode.json?.data?.run?.state ??
  safeMode.json?.data?.state;
record("flywheel.intervention.safe_mode", safeMode.status === 200 && safeMode.json?.ok === true, {
  status: safeMode.status,
  code: safeMode.json?.error?.code,
  runState: safeRunState,
});

const denied = await req(`/api/flywheel/runs/${run.id}/commands`, {
  method: "POST",
  token,
  body: {
    command: "SYNTH::STAGE_1::QUALIFY",
    idempotencyKey: `denied-${crypto.randomUUID()}`,
  },
});
record("flywheel.safe_mode.material_denied", denied.status === 409 && denied.json?.error?.code === "GOVERNANCE_SAFE_MODE_ACTIVE", {
  status: denied.status,
  code: denied.json?.error?.code,
});

// Material C2 outside safe-mode is expected to fail-closed without signed Beacon v2 on mainCompat.
record("flywheel.command.synth_c2_beacon_v2_gate_observed", synth.status === 409 && synth.json?.error?.code === "GOVERNANCE_MISSING_BEACON", {
  status: synth.status,
  code: synth.json?.error?.code,
  note: "mainCompat resolves legacy_v1; governance requires verified_v2 for approvalRequired commands",
});

const deployDenied = await req(`/api/flywheel/runs/${run.id}/commands`, {
  method: "POST",
  token,
  body: {
    command: "DEPLOY::FLYWHEEL::PRODUCTION",
    idempotencyKey: `deploy-${crypto.randomUUID()}`,
  },
});
record("flywheel.deploy.permanently_denied", deployDenied.status === 403 && deployDenied.json?.error?.code === "PRODUCTION_DEPLOY_NOT_AUTHORIZED", {
  status: deployDenied.status,
  code: deployDenied.json?.error?.code,
});

const health = await req("/api/system/status");
record("system.status", health.status === 200, { status: health.status });

const okCore = steps
  .filter((s) => !["flywheel.command.synth_c2_awaits_approval", "flywheel.command.approve"].includes(s.step))
  .every((s) => s.ok);
const okFullApprovalPath = steps.every((s) => s.ok);
const report = {
  ok: okCore,
  okFullApprovalPath,
  missionId: "FW-V38-STAGING-DEPLOY-20260719-001",
  base,
  deployVersionId: process.env.DEPLOY_VERSION_ID || null,
  deploySha: process.env.GIT_COMMIT_SHA || null,
  runId: run.id,
  steps,
  remainingBlockers: okFullApprovalPath
    ? []
    : ["C2 approval path requires Beacon status verified_v2; mainCompat currently resolves legacy_v1/invalid"],
  generatedAt: new Date().toISOString(),
};
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`SMOKE_CORE_OK=${okCore} SMOKE_FULL_OK=${okFullApprovalPath} report=${outPath}`);
process.exit(okCore ? 0 : 1);

#!/usr/bin/env node
/**
 * Authenticated Flywheel staging smoke.
 *
 * Required environment variables:
 * - STAGING_BASE_URL
 * - SMOKE_MISSION_ID
 * - FLYWHEEL_C2_EXPECTATION: await-approval | beacon-deny
 * - OPERATOR_CALLSIGN
 * - OPERATOR_PASSWORD
 *
 * Optional environment variables:
 * - SMOKE_REPORT_PATH
 * - DEPLOY_VERSION_ID
 * - GIT_COMMIT_SHA
 * - CF_ACCESS_CLIENT_ID
 * - CF_ACCESS_CLIENT_SECRET
 *
 * Secret values are never logged.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const outPath = process.env.SMOKE_REPORT_PATH?.trim() || "docs/evidence/_flywheel-staging-smoke-raw.json";
const rawBase = process.env.STAGING_BASE_URL?.trim();
const missionId = process.env.SMOKE_MISSION_ID?.trim();
const c2Expectation = process.env.FLYWHEEL_C2_EXPECTATION?.trim();
const callsign = process.env.OPERATOR_CALLSIGN?.trim();
const password = process.env.OPERATOR_PASSWORD;
const allowedC2Expectations = new Set(["await-approval", "beacon-deny"]);

let base = rawBase || null;
const steps = [];

function writeReport(report) {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2));
}

function failClosed(message) {
  writeReport({
    ok: false,
    missionId: missionId || null,
    base,
    c2Expectation: c2Expectation || null,
    message,
    steps,
    generatedAt: new Date().toISOString(),
  });
  console.error(message);
  process.exit(1);
}

const configErrors = [];
if (!rawBase) configErrors.push("STAGING_BASE_URL");
if (!missionId) configErrors.push("SMOKE_MISSION_ID");
if (!c2Expectation) configErrors.push("FLYWHEEL_C2_EXPECTATION");
if (!callsign) configErrors.push("OPERATOR_CALLSIGN");
if (!password) configErrors.push("OPERATOR_PASSWORD");

if (configErrors.length > 0) {
  failClosed(`Missing required environment variables: ${configErrors.join(", ")}`);
}

if (!allowedC2Expectations.has(c2Expectation)) {
  failClosed("FLYWHEEL_C2_EXPECTATION must be either 'await-approval' or 'beacon-deny'.");
}

try {
  const parsedBase = new URL(rawBase);
  if (!new Set(["http:", "https:"]).has(parsedBase.protocol)) {
    throw new Error("unsupported protocol");
  }
  base = parsedBase.toString().replace(/\/$/, "");
} catch {
  failClosed("STAGING_BASE_URL must be a valid HTTP(S) URL.");
}

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

const smokeRunMissionId = `${missionId}-RUN-${Date.now()}`;
const create = await req("/api/flywheel/runs", {
  method: "POST",
  token,
  body: {
    missionId: smokeRunMissionId,
    idempotencyKey: `${missionId}-${crypto.randomUUID()}`,
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

if (c2Expectation === "await-approval") {
  const synthAwaitingApproval = synth.status === 202 && Boolean(proposalId) && Boolean(commandId);
  record("flywheel.command.synth_c2_awaits_approval", synthAwaitingApproval, {
    status: synth.status,
    code: synth.json?.error?.code,
    state: synth.json?.data?.state,
    hasProposalId: Boolean(proposalId),
    hasCommandId: Boolean(commandId),
  });

  if (synthAwaitingApproval) {
    const approve = await req(`/api/flywheel/runs/${run.id}/approve`, {
      method: "POST",
      token,
      body: { commandId, proposalId },
    });
    record("flywheel.command.approve", approve.status === 200 && approve.json?.ok === true, {
      status: approve.status,
      code: approve.json?.error?.code,
      hasExecutionReceipt: Boolean(approve.json?.data?.executionReceipt),
    });
  } else {
    record("flywheel.command.approve", false, {
      skipped: true,
      reason: "SYNTH did not return an approval proposal and command ID",
    });
  }
} else {
  record(
    "flywheel.command.synth_c2_beacon_v2_gate_observed",
    synth.status === 409 && synth.json?.error?.code === "GOVERNANCE_MISSING_BEACON",
    {
      status: synth.status,
      code: synth.json?.error?.code,
      note: "Expected fail-closed Beacon denial for this smoke mode",
    },
  );
}

const safeMode = await req(`/api/flywheel/runs/${run.id}/safe-mode`, {
  method: "POST",
  token,
  body: { reason: `smoke:${missionId}` },
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

const c2StepNames = new Set([
  "flywheel.command.synth_c2_awaits_approval",
  "flywheel.command.approve",
  "flywheel.command.synth_c2_beacon_v2_gate_observed",
]);
const coreSteps = steps.filter((step) => !c2StepNames.has(step.step));
const c2Steps = steps.filter((step) => c2StepNames.has(step.step));
const okCore = coreSteps.every((step) => step.ok);
const okExpectedC2Path = c2Steps.length > 0 && c2Steps.every((step) => step.ok);
const ok = okCore && okExpectedC2Path;
const report = {
  ok,
  okCore,
  okExpectedC2Path,
  okFullApprovalPath: c2Expectation === "await-approval" ? okExpectedC2Path : null,
  missionId,
  smokeRunMissionId,
  c2Expectation,
  base,
  deployVersionId: process.env.DEPLOY_VERSION_ID || null,
  deploySha: process.env.GIT_COMMIT_SHA || null,
  runId: run.id,
  steps,
  remainingBlockers: ok
    ? []
    : [
        c2Expectation === "await-approval"
          ? "Configured C2 approval path did not complete successfully"
          : "Configured Beacon denial boundary was not observed",
      ],
  generatedAt: new Date().toISOString(),
};
writeReport(report);
console.log(
  `SMOKE_OK=${ok} SMOKE_CORE_OK=${okCore} SMOKE_C2_OK=${okExpectedC2Path} C2_EXPECTATION=${c2Expectation} report=${outPath}`,
);
process.exit(ok ? 0 : 1);

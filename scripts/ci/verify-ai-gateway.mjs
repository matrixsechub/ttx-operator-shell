#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { STAGING_WORKER } from "./verify-staging-config.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const MCP_SMOKE_PAYLOAD = {
  sourceId: "pieces-os-mcp",
  payloadType: "governance-signal",
  proposedAt: new Date().toISOString(),
  proposalId: "ci-ai-gateway-smoke",
  signal: {
    axis: "STABILITY",
    message: "CI AI gateway smoke advisory signal — operator review only",
    severity: "info",
  },
};

const SECRET_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  /(AUTH_SIGNING_KEY|OPERATOR_PASSWORD_HASH|CF_AI_API_TOKEN|N8N_WEBHOOK_SECRET|CLOUDFLARE_API_TOKEN)\s*[:=]\s*\S+/gi,
];

export function redactString(value) {
  if (typeof value !== "string") return value;
  let redacted = value;
  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, "[REDACTED]");
  }
  return redacted;
}

export function redactValue(value) {
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === "object") {
    const next = {};
    for (const [key, entry] of Object.entries(value)) {
      if (/token|secret|authorization|password|bearer/i.test(key)) {
        next[key] = "[REDACTED]";
        continue;
      }
      next[key] = redactValue(entry);
    }
    return next;
  }
  return value;
}

async function probeJson(base, path, init = {}, token) {
  const headers = {
    "Cache-Control": "no-cache",
    Accept: "application/json",
    ...(init.headers ?? {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${base}${path}`, {
    redirect: "manual",
    ...init,
    headers,
  });

  let json = null;
  const text = await response.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return {
    path,
    status: response.status,
    json,
    bodyPreview: redactString(text.slice(0, 240)),
  };
}

function evaluateCheck(name, ok, mandatory, notes = []) {
  return {
    name,
    result: ok ? "PASS" : "FAIL",
    mandatory,
    notes,
  };
}

export async function runAiGatewaySmoke(baseUrl, options = {}) {
  const token = options.token ?? process.env.OPERATOR_BEARER_TOKEN ?? process.env.MSH_OPERATOR_TOKEN ?? null;
  const requireAuthChecks = options.requireAuthChecks ?? Boolean(token);

  const usage = await probeJson(baseUrl, "/api/ai/usage", {}, token);
  const council = await probeJson(baseUrl, "/api/council/packet", {}, token);
  const telemetryEvents = await probeJson(baseUrl, "/api/telemetry/events", {}, token);
  const inferUnauth = await probeJson(
    baseUrl,
    "/api/ai/infer",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: "GuideAgent",
        messages: [{ role: "user", content: "ping" }],
      }),
    },
    null,
  );
  const inferMutateUnauth = await probeJson(
    baseUrl,
    "/api/ai/infer",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: "GuideAgent",
        autonomyClass: "mutate_state",
        messages: [{ role: "user", content: "ping" }],
      }),
    },
    null,
  );
  const mcpSignalUnauth = await probeJson(
    baseUrl,
    "/api/ai/mcp/signal",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(MCP_SMOKE_PAYLOAD),
    },
    null,
  );
  const systemState = await probeJson(baseUrl, "/api/system/state", {}, token);

  const checks = [
    evaluateCheck(
      "infer_requires_auth",
      inferUnauth.status === 401,
      true,
      inferUnauth.status === 401 ? [] : [`expected 401, got ${inferUnauth.status}`],
    ),
    evaluateCheck(
      "infer_mutate_unauth_denied",
      inferMutateUnauth.status === 401,
      true,
      inferMutateUnauth.status === 401 ? [] : [`expected 401, got ${inferMutateUnauth.status}`],
    ),
    evaluateCheck(
      "mcp_signal_unauth_denied",
      mcpSignalUnauth.status === 401,
      true,
      mcpSignalUnauth.status === 401 ? [] : [`expected 401, got ${mcpSignalUnauth.status}`],
    ),
  ];

  if (requireAuthChecks) {
    checks.push(
      evaluateCheck(
        "ai_usage_endpoint",
        usage.status === 200 && usage.json?.ok === true,
        true,
        usage.status === 200 && usage.json?.ok === true ? [] : [`status ${usage.status}`],
      ),
      evaluateCheck(
        "council_packet_advisory",
        council.status === 200 && council.json?.packet?.advisoryOnly === true,
        true,
        council.status === 200 && council.json?.packet?.advisoryOnly === true
          ? []
          : [`status ${council.status}`],
      ),
      evaluateCheck(
        "telemetry_events",
        telemetryEvents.status === 200 && Array.isArray(telemetryEvents.json?.events),
        true,
        telemetryEvents.status === 200 && Array.isArray(telemetryEvents.json?.events)
          ? []
          : [`status ${telemetryEvents.status}`],
      ),
      evaluateCheck(
        "system_state_ai_gateway",
        systemState.status === 200 && Boolean(systemState.json?.state?.aiGateway),
        true,
        systemState.status === 200 && systemState.json?.state?.aiGateway
          ? []
          : [`status ${systemState.status}`],
      ),
    );

    if (token) {
      const mcpSignal = await probeJson(
        baseUrl,
        "/api/ai/mcp/signal",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...MCP_SMOKE_PAYLOAD,
            proposedAt: new Date().toISOString(),
            proposalId: `ci-ai-gateway-smoke-${Date.now()}`,
          }),
        },
        token,
      );
      checks.push(
        evaluateCheck(
          "mcp_signal_no_mutation",
          mcpSignal.status === 200 && mcpSignal.json?.mutationApplied === false,
          true,
          mcpSignal.status === 200 && mcpSignal.json?.mutationApplied === false
            ? []
            : [`status ${mcpSignal.status}`],
        ),
      );
    }
  } else {
    checks.push(
      evaluateCheck(
        "ai_usage_unauth_or_denied",
        usage.status === 401,
        true,
        usage.status === 401 ? [] : [`expected 401 without token, got ${usage.status}`],
      ),
      evaluateCheck(
        "council_packet_unauth_or_denied",
        council.status === 401,
        true,
        council.status === 401 ? [] : [`expected 401 without token, got ${council.status}`],
      ),
      evaluateCheck(
        "telemetry_events_unauth_or_denied",
        telemetryEvents.status === 401,
        true,
        telemetryEvents.status === 401 ? [] : [`expected 401 without token, got ${telemetryEvents.status}`],
      ),
      evaluateCheck(
        "system_state_unauth_or_denied",
        systemState.status === 401,
        true,
        systemState.status === 401 ? [] : [`expected 401 without token, got ${systemState.status}`],
      ),
    );
  }

  const summary = {
    passed: checks.filter((c) => c.result === "PASS").length,
    failed: checks.filter((c) => c.result === "FAIL").length,
    mandatory_failed: checks.filter((c) => c.result === "FAIL" && c.mandatory).length,
  };

  return redactValue({
    schema_version: "1.0",
    control: "ai_gateway_smoke",
    environment: options.environment ?? "staging",
    base_url: baseUrl,
    worker_name: options.workerName ?? STAGING_WORKER,
    commit_sha: options.commitSha ?? process.env.COMMIT_SHA ?? "unknown",
    tested_at: new Date().toISOString(),
    auth_mode: requireAuthChecks ? "operator_bearer" : "unauthenticated",
    summary,
    checks,
    ok: summary.mandatory_failed === 0,
  });
}

async function main() {
  const baseUrl =
    process.argv[2] ??
    process.env.STAGING_BASE_URL ??
    "https://ttx-operator-shell-staging.sogellagepul.workers.dev";
  const commitSha = process.argv[3] ?? process.env.COMMIT_SHA ?? "unknown";
  const outputPath = process.argv[4] ?? join(root, "artifacts", "ai-gateway-smoke-report.json");
  const token = process.env.OPERATOR_BEARER_TOKEN ?? process.env.MSH_OPERATOR_TOKEN ?? null;
  const requireOperatorToken =
    process.env.REQUIRE_OPERATOR_TOKEN === "1" || process.env.REQUIRE_OPERATOR_TOKEN === "true";

  if (requireOperatorToken && !token?.trim()) {
    console.error("AI_GATEWAY_SMOKE::FAIL");
    console.error("  - OPERATOR_BEARER_TOKEN is required but missing or empty");
    process.exit(1);
  }

  const report = await runAiGatewaySmoke(baseUrl, { commitSha, token: token?.trim() || null });
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(JSON.stringify(report.summary, null, 2));
  if (!report.ok) {
    console.error("AI_GATEWAY_SMOKE::FAIL");
    process.exit(1);
  }
  console.log("AI_GATEWAY_SMOKE::PASS");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

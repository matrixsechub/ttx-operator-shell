#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateStagingBaseUrl } from "../lib/stagingBaseUrl.mjs";
import { STAGING_WORKER } from "./verify-staging-config.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const SMOKE_ROUTE_CONTRACTS = [
  {
    name: "ecosystem_root",
    method: "GET",
    path: "/",
    expectStatus: 200,
    contentTypeIncludes: "text/html",
    htmlIncludes: ["MSHOPS.NET", "Service Selection Funnel"],
    securityHeaders: true,
  },
  {
    name: "marketplace_surface",
    method: "GET",
    path: "/marketplace",
    expectStatus: 200,
    contentTypeIncludes: "text/html",
    htmlIncludes: ["MSH OPS Storefront"],
    securityHeaders: true,
  },
  {
    name: "auth_login_shell",
    method: "GET",
    path: "/login",
    expectStatus: 200,
    contentTypeIncludes: "text/html",
    htmlIncludes: ["Operator Auth", "Operator Login"],
    securityHeaders: true,
  },
  {
    name: "operator_systems_boundary",
    method: "GET",
    path: "/systems",
    expectStatus: 200,
    contentTypeIncludes: "text/html",
    htmlIncludes: ["Operator Terminal"],
    securityHeaders: true,
  },
  {
    name: "ttx_operator_route",
    method: "GET",
    path: "/ttx",
    expectStatus: 200,
    contentTypeIncludes: "text/html",
    htmlIncludes: ["Operator Terminal"],
    securityHeaders: true,
  },
  {
    name: "build_info_public",
    method: "GET",
    path: "/api/build-info",
    expectStatus: 200,
    contentTypeIncludes: "application/json",
    jsonFields: ["commitSha", "deployEnv"],
  },
  {
    name: "engine_health_public",
    method: "GET",
    path: "/api/engine/health",
    expectStatus: 200,
    contentTypeIncludes: "application/json",
  },
  {
    name: "engine_version_public",
    method: "GET",
    path: "/api/engine/version",
    expectStatus: 200,
    contentTypeIncludes: "application/json",
  },
  {
    name: "protected_security_events",
    method: "GET",
    path: "/api/security/events",
    expectStatus: 401,
    contentTypeIncludes: "application/json",
  },
  {
    name: "protected_ttx_scenarios",
    method: "GET",
    path: "/api/ttx/sessions/scenarios",
    expectStatus: 401,
    contentTypeIncludes: "application/json",
  },
  {
    name: "controlled_missing_route",
    method: "GET",
    path: "/api/__staging-smoke-missing-route__",
    expectStatus: 401,
    contentTypeIncludes: "application/json",
  },
];

const SECURITY_HEADER_CHECKS = [
  { key: "x-content-type-options", severity: "FAIL" },
  { key: "referrer-policy", severity: "WARNING" },
  { key: "permissions-policy", severity: "WARNING" },
  { key: "strict-transport-security", severity: "WARNING" },
  { key: "content-security-policy", severity: "WARNING", altKey: "content-security-policy-report-only" },
  { key: "x-frame-options", severity: "WARNING", altKey: "content-security-policy" },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isCloudflareErrorPage(text) {
  return /cloudflare ray id|error code 5\d\d/i.test(text);
}

function classifyStatus(contract, status) {
  if (contract.expectStatus !== undefined) return status === contract.expectStatus;
  if (contract.expectStatusClass === "4xx") return status >= 400 && status < 500;
  return false;
}

function checkSecurityHeaders(headers, notes) {
  let failed = false;
  for (const check of SECURITY_HEADER_CHECKS) {
    const primary = headers.get(check.key);
    const alt = check.altKey ? headers.get(check.altKey) : null;
    if (primary || (check.key === "x-frame-options" && alt?.includes("frame-ancestors"))) {
      continue;
    }
    const message = `missing header ${check.key}`;
    notes.push(message);
    if (check.severity === "FAIL") failed = true;
  }
  return failed;
}

async function probe(baseUrl, contract) {
  const url = new URL(contract.path, baseUrl).toString();
  const started = Date.now();
  const response = await fetch(url, {
    method: contract.method,
    redirect: "manual",
    headers: { Accept: contract.contentTypeIncludes?.includes("json") ? "application/json" : "*/*", "Cache-Control": "no-cache" },
  });
  const durationMs = Date.now() - started;
  const contentType = response.headers.get("content-type") ?? "";
  const location = response.headers.get("location");
  const text = response.status === 301 || response.status === 302 ? "" : await response.text();

  const notes = [];
  let result = "PASS";

  if (!classifyStatus(contract, response.status)) {
    result = "FAIL";
    notes.push(`expected status ${contract.expectStatus ?? contract.expectStatusClass}, got ${response.status}`);
  }

  if (response.status >= 500) {
    result = "FAIL";
    notes.push("server error status");
  }

  if (contract.contentTypeIncludes && !contentType.includes(contract.contentTypeIncludes)) {
    result = "FAIL";
    notes.push(`unexpected content-type ${contentType || "(none)"}`);
  }

  if (contract.htmlIncludes?.length) {
    const matched = contract.htmlIncludes.some((marker) => text.includes(marker));
    if (!matched) {
      result = "FAIL";
      notes.push("missing expected HTML marker");
    }
  }

  if (contract.redirectIncludes && (!location || !location.includes(contract.redirectIncludes))) {
    result = "FAIL";
    notes.push(`redirect location ${location ?? "(none)"} missing ${contract.redirectIncludes}`);
  }

  if (location) {
    try {
      const redirectHost = new URL(location, baseUrl).host;
      const baseHost = new URL(baseUrl).host;
      if (redirectHost && baseHost && redirectHost !== baseHost && !location.includes("/login")) {
        result = "FAIL";
        notes.push(`unsafe redirect host ${redirectHost}`);
      }
    } catch {
      result = "FAIL";
      notes.push("invalid redirect location");
    }
  }

  if (text && isCloudflareErrorPage(text)) {
    result = "FAIL";
    notes.push("cloudflare error page detected");
  }

  if (contract.jsonFields?.length) {
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      result = "FAIL";
      notes.push("response is not valid JSON");
    }
    if (json) {
      for (const field of contract.jsonFields) {
        if (!(field in json)) {
          result = "FAIL";
          notes.push(`missing json field ${field}`);
        }
      }
    }
  }

  if (contract.securityHeaders && contentType.includes("text/html")) {
    const headerFailed = checkSecurityHeaders(response.headers, notes);
    if (headerFailed) result = "FAIL";
    else if (notes.length > 0 && result === "PASS") result = "WARNING";
  }

  if (text.includes("AUTH_SIGNING_KEY") || text.includes("OPERATOR_PASSWORD_HASH")) {
    result = "FAIL";
    notes.push("response appears to expose secret material");
  }

  return {
    name: contract.name,
    method: contract.method,
    path: contract.path,
    status: response.status,
    content_type: contentType,
    result,
    duration_ms: durationMs,
    notes,
  };
}

async function probeWithRetry(baseUrl, contract, maxAttempts = 5) {
  let last = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    last = await probe(baseUrl, contract);
    if (last.result === "PASS" || last.result === "WARNING") return last;
    if (last.status >= 400 && last.status < 500 && contract.expectStatusClass !== "4xx" && contract.expectStatus !== last.status) {
      return last;
    }
    if (attempt < maxAttempts) await sleep(attempt * 1000);
  }
  return last;
}

export async function runStagingSmoke(baseUrl, commitSha, options = {}) {
  // Internal gate — do not rely on CLI callers. Fail before any fetch/DNS/auth.
  const validated = validateStagingBaseUrl(baseUrl);
  if (!validated.ok) {
    throw new Error(validated.error);
  }
  const safeBaseUrl = validated.baseUrl;

  const contracts = options.contracts ?? SMOKE_ROUTE_CONTRACTS;
  const checks = [];
  for (const contract of contracts) {
    checks.push(await probeWithRetry(safeBaseUrl, contract, options.maxAttempts ?? 5));
  }

  const summary = {
    passed: checks.filter((c) => c.result === "PASS").length,
    failed: checks.filter((c) => c.result === "FAIL").length,
    warnings: checks.filter((c) => c.result === "WARNING").length,
  };

  const report = {
    schema_version: "1.0",
    environment: "staging",
    base_url: safeBaseUrl,
    worker_name: STAGING_WORKER,
    commit_sha: commitSha,
    tested_at: new Date().toISOString(),
    summary,
    checks,
  };

  return report;
}

async function main() {
  const rawBase = process.argv[2] ?? process.env.STAGING_BASE_URL;
  const validated = validateStagingBaseUrl(rawBase);
  if (!validated.ok) {
    console.error(validated.error);
    process.exit(1);
  }

  const commitSha = process.argv[3] ?? process.env.COMMIT_SHA ?? "unknown";
  const outputPath = process.argv[4] ?? join(root, "artifacts", "staging-smoke-report.json");

  const report = await runStagingSmoke(validated.baseUrl, commitSha);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report.summary, null, 2));
  process.exit(report.summary.failed > 0 ? 1 : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

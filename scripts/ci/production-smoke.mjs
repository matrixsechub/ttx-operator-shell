#!/usr/bin/env node

/**
 * Production smoke verification. Runs AFTER a production deploy and FAILS THE
 * WORKFLOW when any check fails — unlike the previous `curl | echo` step, which
 * probed www.mshops.net (a different property) and could not fail.
 *
 * Reuses the staging smoke probe engine (status, redirect safety, security
 * headers, secret-leak detection, retry/backoff) so the two environments cannot
 * drift. Differences from staging, all deliberate:
 *   - hostname allowlist is the production Worker (scripts/lib/productionBaseUrl.mjs)
 *   - no Cloudflare Access service token: production is not behind Access
 *   - build identity is asserted, not merely present (see F4)
 */

import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateProductionBaseUrl } from "../lib/productionBaseUrl.mjs";
import {
  SMOKE_ROUTE_CONTRACTS,
  emitFailedProbeDiagnostics,
  persistStagingSmokeReport,
  probeWithRetry,
} from "./staging-smoke.mjs";
import { PRODUCTION_WORKER } from "./verify-staging-config.mjs";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

export const PRODUCTION_DEPLOY_ENV = "production";

/**
 * Assert the deployed Worker reports the commit we just shipped.
 * This is the check that makes `commitSha: "unknown"` a deploy failure
 * rather than a silent steady state.
 *
 * @param {unknown} payload parsed /api/build-info body
 * @param {string} expectedCommitSha
 */
export function evaluateBuildIdentity(payload, expectedCommitSha) {
  const notes = [];
  const body = payload && typeof payload === "object" ? payload : {};
  const commitSha = typeof body.commitSha === "string" ? body.commitSha.trim() : "";
  const deployEnv = typeof body.deployEnv === "string" ? body.deployEnv.trim() : "";

  if (!commitSha || commitSha === "unknown") {
    notes.push('build-info commitSha is missing or "unknown" — build identity was not supplied at deploy');
  } else if (expectedCommitSha && expectedCommitSha !== "unknown") {
    const matches =
      commitSha === expectedCommitSha ||
      commitSha.startsWith(expectedCommitSha) ||
      expectedCommitSha.startsWith(commitSha);
    if (!matches) {
      notes.push("build-info commitSha does not match the deployed commit");
    }
  }

  if (deployEnv !== PRODUCTION_DEPLOY_ENV) {
    notes.push(`build-info deployEnv is "${deployEnv || "(absent)"}", expected "${PRODUCTION_DEPLOY_ENV}"`);
  }

  return { result: notes.length > 0 ? "FAIL" : "PASS", notes };
}

async function checkBuildIdentity(baseUrl, expectedCommitSha, fetchImpl = fetch) {
  const started = Date.now();
  let payload = null;
  const notes = [];
  try {
    const response = await fetchImpl(new URL("/api/build-info", baseUrl).toString(), {
      method: "GET",
      redirect: "manual",
      headers: { Accept: "application/json", "Cache-Control": "no-cache" },
    });
    if (response.status !== 200) {
      notes.push(`build-info returned status ${response.status}`);
    } else {
      payload = JSON.parse(await response.text());
    }
  } catch {
    notes.push("build-info request failed or returned invalid JSON");
  }

  const evaluated = payload ? evaluateBuildIdentity(payload, expectedCommitSha) : { result: "FAIL", notes: [] };
  return {
    name: "build_identity_matches_deploy",
    method: "GET",
    path: "/api/build-info",
    status: payload ? 200 : 0,
    content_type: "application/json",
    result: notes.length > 0 ? "FAIL" : evaluated.result,
    duration_ms: Date.now() - started,
    notes: [...notes, ...evaluated.notes],
  };
}

export async function runProductionSmoke(baseUrl, commitSha, options = {}) {
  // Internal gate — do not rely on CLI callers. Fail before any fetch/DNS.
  const validated = validateProductionBaseUrl(baseUrl);
  if (!validated.ok) {
    throw new Error(validated.error);
  }
  const safeBaseUrl = validated.baseUrl;

  const contracts = options.contracts ?? SMOKE_ROUTE_CONTRACTS;
  const checks = [];
  for (const contract of contracts) {
    // No Access credentials: production is not behind Cloudflare Access.
    checks.push(await probeWithRetry(safeBaseUrl, contract, {}, options.maxAttempts ?? 5));
  }
  checks.push(await checkBuildIdentity(safeBaseUrl, commitSha, options.fetchImpl ?? fetch));

  const summary = {
    passed: checks.filter((c) => c.result === "PASS").length,
    failed: checks.filter((c) => c.result === "FAIL").length,
    warnings: checks.filter((c) => c.result === "WARNING").length,
  };

  return {
    schema_version: "1.0",
    environment: PRODUCTION_DEPLOY_ENV,
    base_url: safeBaseUrl,
    worker_name: PRODUCTION_WORKER,
    commit_sha: commitSha,
    tested_at: new Date().toISOString(),
    summary,
    checks,
  };
}

async function main() {
  const rawBase = process.argv[2] ?? process.env.PRODUCTION_BASE_URL;
  const validated = validateProductionBaseUrl(rawBase);
  if (!validated.ok) {
    console.error(validated.error);
    process.exit(1);
  }

  const commitSha = process.argv[3] ?? process.env.COMMIT_SHA ?? "unknown";
  const outputPath = process.argv[4] ?? join(root, "artifacts", "production-smoke-report.json");

  const report = await runProductionSmoke(validated.baseUrl, commitSha);
  // Persist before exit so artifact upload (if: always()) can recover failed runs.
  persistStagingSmokeReport(report, outputPath);
  emitFailedProbeDiagnostics(report.checks);
  console.log(JSON.stringify(report.summary, null, 2));
  process.exit(report.summary.failed > 0 ? 1 : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

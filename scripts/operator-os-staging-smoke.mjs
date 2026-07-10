#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cfAccessConfigured } from "./lib/cfAccess.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const startedAt = new Date().toISOString();
const runId =
  process.env.OPERATOR_OS_SMOKE_RUN_ID?.trim() ??
  `operator-os-phase1-smoke-${Date.now()}-${randomBytes(4).toString("hex")}`;

function resolveCommitSha() {
  if (process.env.COMMIT_SHA?.trim()) return process.env.COMMIT_SHA.trim();
  try {
    return execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function validateLocalHarness() {
  const requiredScripts = [
    "scripts/ci/staging-governance-proof.mjs",
    "scripts/operator-os-staging-cleanup.mjs",
    "scripts/codex-validate.mjs",
    "scripts/publish-beacon-v2.mjs",
  ];
  const missing = requiredScripts.filter((rel) => !existsSync(join(root, rel)));
  const report = {
    run_id: runId,
    mode: "local_validate",
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    commit_sha: resolveCommitSha(),
    overall_status: missing.length === 0 ? "READY" : "BLOCKED",
    missing_scripts: missing,
    cf_access_configured: cfAccessConfigured(),
    required_runtime_variables: [
      "STAGING_BASE_URL",
      "OPERATOR_AUTH_TOKEN",
      "CF_ACCESS_CLIENT_ID",
      "CF_ACCESS_CLIENT_SECRET",
    ],
    note: "Deployment not invoked; run against staging after RC deploy authorization.",
  };
  mkdirSync(join(root, "artifacts"), { recursive: true });
  const out = join(root, "artifacts", `operator-os-staging-smoke-local-${runId}.json`);
  writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  process.exit(missing.length === 0 ? 0 : 1);
}

function mapProofToEvidence(proof, meta) {
  const negative = (proof.checks ?? [])
    .filter((c) => /replay|tamper|legacy|expired|denied|reject|disabled|drift|mismatch|missing/i.test(c.name))
    .map((c) => ({ name: c.name, result: c.result, code: c.code ?? null }));
  return {
    run_id: runId,
    base_url: meta.baseUrl,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    commit_sha: meta.commitSha,
    deployment_id: proof.deployment_id ?? null,
    beacon_version: proof.beacon_version ?? "2.0.0",
    beacon_hash: proof.beacon_hash ?? null,
    beacon_status: proof.checks?.find((c) => c.name === "beacon_v2_verified")?.result === "PASS" ? "verified_v2" : "invalid",
    codex_hash: proof.codex_hash ?? null,
    receipt_authority_status:
      proof.checks?.find((c) => /receipt_authority|receipt.*authority/i.test(c.name))?.result === "PASS"
        ? "available"
        : proof.checks?.some((c) => c.name === "concurrency_single_mutation")?.result === "PASS"
          ? "available"
          : "unknown",
    proposal_id: proof.proposal_id ?? null,
    approval_id: proof.approval_id ?? null,
    execution_id: proof.execution_id ?? null,
    audit_bundle_id: proof.audit_bundle_id ?? null,
    idempotency_key: proof.idempotency_key ?? null,
    concurrent_results: proof.concurrency ?? null,
    negative_test_results: negative,
    cleanup_result: { status: "pending", script: "scripts/operator-os-staging-cleanup.mjs" },
    overall_status: proof.status === "PASS" ? "PASS" : "FAIL",
    proof_artifact: meta.outputPath,
    redaction_result: proof.redaction_result ?? null,
  };
}

async function main() {
  if (process.argv.includes("--validate-local")) {
    validateLocalHarness();
    return;
  }

  const baseUrl = (process.env.STAGING_BASE_URL ?? "").replace(/\/$/, "");
  const token =
    process.env.OPERATOR_AUTH_TOKEN?.trim() ??
    process.env.OPERATOR_BEARER_TOKEN?.trim();
  if (!baseUrl) {
    console.error("STAGING_BASE_URL is required (or use --validate-local)");
    process.exit(1);
  }
  if (!token) {
    console.error("OPERATOR_AUTH_TOKEN (or OPERATOR_BEARER_TOKEN) is required");
    process.exit(1);
  }

  const commitSha = resolveCommitSha();
  const outputPath = join(root, "artifacts", `operator-os-staging-proof-${runId}.json`);
  mkdirSync(dirname(outputPath), { recursive: true });

  const child = spawnSync(
    "node",
    ["scripts/ci/staging-governance-proof.mjs", baseUrl, commitSha, outputPath],
    {
      cwd: root,
      env: {
        ...process.env,
        OPERATOR_BEARER_TOKEN: token,
        OPERATOR_OS_SMOKE_RUN_ID: runId,
      },
      encoding: "utf8",
    },
  );

  if (child.stdout) process.stdout.write(child.stdout);
  if (child.stderr) process.stderr.write(child.stderr);

  let proof = {};
  try {
    proof = JSON.parse(readFileSync(outputPath, "utf8"));
  } catch {
    proof = { status: "FAIL", checks: [] };
  }

  const evidence = mapProofToEvidence(proof, { baseUrl, commitSha, outputPath });
  const evidencePath = join(root, "artifacts", `operator-os-staging-evidence-${runId}.json`);
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`OPERATOR_OS_STAGING_SMOKE::${evidence.overall_status}`);
  console.log(JSON.stringify({ evidence_path: evidencePath, run_id: runId }, null, 2));
  process.exit(child.status === 0 && evidence.overall_status === "PASS" ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

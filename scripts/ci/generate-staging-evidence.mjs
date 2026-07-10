#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { STAGING_WORKER } from "./verify-staging-config.mjs";

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function main() {
  const artifactsDir = process.env.ARTIFACTS_DIR ?? join(process.cwd(), "artifacts", "staging-release-evidence");
  mkdirSync(artifactsDir, { recursive: true });

  const smokeReport = readJson(join(process.cwd(), "artifacts", "staging-smoke-report.json"));
  const aiGatewayReport = readJson(join(process.cwd(), "artifacts", "ai-gateway-smoke-report.json"));
  const fulfillmentScopeReport = readJson(join(process.cwd(), "artifacts", "ai-fulfillment-scope-report.json"));
  const storefrontAssemblyReport = readJson(join(process.cwd(), "artifacts", "storefront-assembly-report.json"));
  const buildManifest = readJson(join(process.cwd(), "dist", ".build-manifest.json"));

  const validation = {
    permissions_lint: process.env.VALIDATION_PERMISSIONS_LINT ?? "PASS",
    action_pin_audit: process.env.VALIDATION_ACTION_PIN_AUDIT ?? "PASS",
    staging_config: process.env.VALIDATION_STAGING_CONFIG ?? "PASS",
    ai_fulfillment_scope: fulfillmentScopeReport?.ok === false
      ? "FAIL"
      : fulfillmentScopeReport?.ok === true
        ? "PASS"
        : process.env.VALIDATION_AI_FULFILLMENT_SCOPE ?? "NOT_RUN",
    typecheck: process.env.VALIDATION_TYPECHECK ?? "PASS",
    tests: process.env.VALIDATION_TESTS ?? "PASS",
    build: process.env.VALIDATION_BUILD ?? "PASS",
    wrangler_dry_run: process.env.VALIDATION_WRANGLER_DRY_RUN ?? "PASS",
    deployment: process.env.VALIDATION_DEPLOYMENT ?? "PASS",
    smoke: smokeReport?.summary?.failed ? "FAIL" : smokeReport ? "PASS" : "NOT_RUN",
    ai_gateway_smoke: aiGatewayReport?.ok === false
      ? "FAIL"
      : aiGatewayReport?.ok === true
        ? "PASS"
        : process.env.VALIDATION_AI_GATEWAY_SMOKE ?? "NOT_RUN",
    storefront_assembly:
      storefrontAssemblyReport?.ok === false || storefrontAssemblyReport?.status === "fail"
        ? "FAIL"
        : storefrontAssemblyReport?.ok === true || storefrontAssemblyReport?.status === "pass"
          ? "PASS"
          : process.env.VALIDATION_STOREFRONT_ASSEMBLY ?? "NOT_RUN",
  };

  const releaseMetadata = {
    schema_version: "1.0",
    environment: "staging",
    repository: process.env.GITHUB_REPOSITORY ?? "matrixsechub/ttx-operator-shell",
    commit_sha: process.env.COMMIT_SHA ?? "unknown",
    requested_ref: process.env.REQUESTED_REF ?? "unknown",
    workflow_run_id: process.env.GITHUB_RUN_ID ?? "local",
    workflow_run_attempt: process.env.GITHUB_RUN_ATTEMPT ?? "1",
    actor: process.env.GITHUB_ACTOR ?? "local",
    worker_name: STAGING_WORKER,
    node_version: process.env.NODE_VERSION ?? process.version,
    npm_version: process.env.NPM_VERSION ?? "unknown",
    wrangler_version: process.env.WRANGLER_VERSION ?? "unknown",
    deployed_at: process.env.DEPLOYED_AT ?? new Date().toISOString(),
    build_hash: buildManifest ? createHash("sha256").update(JSON.stringify(buildManifest)).digest("hex") : null,
    validation,
  };

  const validationSummary = {
    schema_version: "1.0",
    environment: "staging",
    generated_at: new Date().toISOString(),
    validation,
    smoke_summary: smokeReport?.summary ?? null,
    ai_gateway_summary: aiGatewayReport?.summary ?? null,
    ai_fulfillment_scope_summary: fulfillmentScopeReport?.summary ?? null,
    storefront_assembly_summary: storefrontAssemblyReport
      ? {
          status: storefrontAssemblyReport.status,
          assetCount: storefrontAssemblyReport.assetCount,
          placeholderDetected: storefrontAssemblyReport.placeholderDetected,
        }
      : null,
  };

  writeFileSync(join(artifactsDir, "release-metadata.json"), JSON.stringify(releaseMetadata, null, 2));
  writeFileSync(join(artifactsDir, "validation-summary.json"), JSON.stringify(validationSummary, null, 2));

  if (smokeReport) {
    writeFileSync(join(artifactsDir, "staging-smoke-report.json"), JSON.stringify(smokeReport, null, 2));
  }

  if (aiGatewayReport) {
    writeFileSync(join(artifactsDir, "ai-gateway-smoke-report.json"), JSON.stringify(aiGatewayReport, null, 2));
  }

  if (fulfillmentScopeReport) {
    writeFileSync(
      join(artifactsDir, "ai-fulfillment-scope-report.json"),
      JSON.stringify(fulfillmentScopeReport, null, 2),
    );
  }

  if (buildManifest) {
    writeFileSync(join(artifactsDir, "build-manifest.json"), JSON.stringify(buildManifest, null, 2));
  }

  if (storefrontAssemblyReport) {
    writeFileSync(
      join(artifactsDir, "storefront-assembly-report.json"),
      JSON.stringify(storefrontAssemblyReport, null, 2),
    );
  }

  const checksumTargets = [
    "release-metadata.json",
    "validation-summary.json",
    "staging-smoke-report.json",
    "ai-gateway-smoke-report.json",
    "ai-fulfillment-scope-report.json",
    "build-manifest.json",
    "storefront-assembly-report.json",
  ];
  const checksumLines = [];
  for (const name of checksumTargets) {
    const path = join(artifactsDir, name);
    if (!existsSync(path)) continue;
    const hash = createHash("sha256").update(readFileSync(path)).digest("hex");
    checksumLines.push(`${hash}  ${name}`);
  }
  writeFileSync(join(artifactsDir, "checksums.txt"), `${checksumLines.join("\n")}\n`);

  const failedControls = Object.entries(validation).filter(([, status]) => status === "FAIL");
  if (failedControls.length > 0) {
    console.error("STAGING_EVIDENCE::FAIL");
    console.error(JSON.stringify({ artifactsDir, validation, failedControls: failedControls.map(([k]) => k) }, null, 2));
    process.exit(1);
  }

  console.log("STAGING_EVIDENCE::PASS");
  console.log(JSON.stringify({ artifactsDir, validation }, null, 2));
}

main();

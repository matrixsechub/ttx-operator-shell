#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const FORBIDDEN_TRUTHY = new Set(["true", "1", "yes", "on"]);

export const FULFILLMENT_SCOPE_TARGETS = [
  { file: "wrangler.jsonc", scope: "production", section: "root" },
  { file: "wrangler.jsonc", scope: "staging", section: "staging" },
  { file: "wrangler.mshops-operator.jsonc", scope: "mshops-operator", section: "root" },
  { file: "wrangler.mshops-public.jsonc", scope: "mshops-public", section: "root" },
];

function extractVarsBlock(raw, section) {
  if (section === "root") {
    const beforeEnv = raw.split('"env"')[0];
    const match = beforeEnv.match(/"vars"\s*:\s*\{([\s\S]*?)\n\s*\}/);
    return match?.[1] ?? "";
  }
  const stagingBlock = raw.match(/"staging"\s*:\s*\{[\s\S]*?\n\s*\}\s*\n\s*\}/)?.[0] ?? "";
  const match = stagingBlock.match(/"vars"\s*:\s*\{([\s\S]*?)\n\s*\}/);
  return match?.[1] ?? "";
}

export function readFulfillmentFlag(raw, section) {
  const varsBlock = extractVarsBlock(raw, section);
  const match = varsBlock.match(/"AI_FULFILLMENT_ENABLED"\s*:\s*"([^"]*)"/);
  return match?.[1] ?? null;
}

export function isFulfillmentEnabled(value) {
  if (value === null || value === undefined) return false;
  return FORBIDDEN_TRUTHY.has(String(value).trim().toLowerCase());
}

export function verifyFulfillmentScope(options = {}) {
  const targets = options.targets ?? FULFILLMENT_SCOPE_TARGETS;
  const errors = [];
  const checks = [];

  for (const target of targets) {
    const path = join(root, target.file);
    let raw;
    try {
      raw = readFileSync(path, "utf8");
    } catch {
      errors.push(`Missing config file ${target.file}`);
      checks.push({
        file: target.file,
        scope: target.scope,
        value: null,
        result: "FAIL",
        notes: ["file not found"],
      });
      continue;
    }

    const value = readFulfillmentFlag(raw, target.section);
    const enabled = isFulfillmentEnabled(value);
    const result = enabled ? "FAIL" : value === "false" ? "PASS" : "FAIL";
    const notes = [];
    if (enabled) {
      notes.push(`AI_FULFILLMENT_ENABLED must remain false (found "${value}")`);
      errors.push(`${target.file} [${target.scope}]: AI_FULFILLMENT_ENABLED is enabled`);
    } else if (value !== "false") {
      notes.push(`AI_FULFILLMENT_ENABLED must be explicitly "false" (found ${value ?? "unset"})`);
      errors.push(`${target.file} [${target.scope}]: AI_FULFILLMENT_ENABLED is not explicitly false`);
    }

    checks.push({
      file: target.file,
      scope: target.scope,
      value,
      result,
      notes,
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    checks,
    summary: {
      passed: checks.filter((c) => c.result === "PASS").length,
      failed: checks.filter((c) => c.result === "FAIL").length,
    },
  };
}

export function buildFulfillmentScopeReport(options = {}) {
  const result = verifyFulfillmentScope(options);
  return {
    schema_version: "1.0",
    control: "ai_fulfillment_scope",
    tested_at: new Date().toISOString(),
    summary: result.summary,
    checks: result.checks,
    ok: result.ok,
  };
}

function main() {
  const result = verifyFulfillmentScope();
  const report = buildFulfillmentScopeReport();
  const outputPath = process.env.ARTIFACT_PATH ?? join(root, "artifacts", "ai-fulfillment-scope-report.json");
  try {
    mkdirSync(join(root, "artifacts"), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  } catch {
    // Artifact write is best-effort for local runs.
  }

  if (result.ok) {
    console.log("AI_FULFILLMENT_SCOPE::PASS");
    console.log(JSON.stringify(result.summary, null, 2));
    process.exit(0);
  }

  console.error("AI_FULFILLMENT_SCOPE::FAIL");
  for (const error of result.errors) {
    console.error(`  - ${error}`);
  }
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}

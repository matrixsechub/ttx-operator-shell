#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  readWranglerKvBindings,
  validateStagingKvConfig,
} from "../lib/stagingKvPlaceholders.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const wranglerPath = join(root, "wrangler.jsonc");

const PRODUCTION_WORKER = "ttx-operator-shell";
const STAGING_WORKER = "ttx-operator-shell-staging";
const REQUIRED_KV_BINDINGS = ["AUTH_REVOCATION", "WEBHOOK_EVENTS", "SECURITY_EVENTS", "TTX_STATE"];
const REQUIRED_DO_BINDINGS = ["GOVERNANCE", "SESSION", "MARKETPLACE", "LIVE_TTX_SESSIONS"];

function maskId(id) {
  if (!id || id.length < 8) return "(invalid)";
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

function extractQuoted(block, key) {
  const match = block.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`));
  return match?.[1] ?? null;
}

function extractBindingNames(block, bindingKey) {
  const names = [];
  const pattern = new RegExp(`"name"\\s*:\\s*"([^"]+)"[^}]*"class_name"`, "g");
  if (bindingKey === "durable_objects") {
    const section = block.match(/"durable_objects"\s*:\s*\{[\s\S]*?"bindings"\s*:\s*\[([\s\S]*?)\]/)?.[1] ?? "";
    for (const match of section.matchAll(/"name"\s*:\s*"([^"]+)"/g)) {
      names.push(match[1]);
    }
  }
  return names;
}

function parseWrangler() {
  const raw = readFileSync(wranglerPath, "utf8");
  const prodSection = raw.split('"env"')[0];
  const stagingBlock = raw.match(/"staging"\s*:\s*\{[\s\S]*?\n\s*\}\s*\n\s*\}/)?.[0] ?? "";

  if (!stagingBlock) {
    return { ok: false, errors: ["Missing env.staging block in wrangler.jsonc"] };
  }

  const productionName = extractQuoted(prodSection, "name");
  const stagingName = extractQuoted(stagingBlock, "name");
  const compatibilityDate = extractQuoted(prodSection, "compatibility_date");
  const stagingCompatibilityDate = extractQuoted(stagingBlock, "compatibility_date") ?? compatibilityDate;

  const prodKv = readWranglerKvBindings(wranglerPath).production;
  const stagingKv = readWranglerKvBindings(wranglerPath).staging;
  const kvResult = validateStagingKvConfig({ production: prodKv, staging: stagingKv });

  const errors = kvResult.ok ? [] : [...kvResult.errors];

  if (!productionName) errors.push("Missing top-level Worker name in wrangler.jsonc");
  if (!stagingName) errors.push("Missing env.staging.name in wrangler.jsonc");
  if (productionName !== PRODUCTION_WORKER) {
    errors.push(`Production Worker name must be "${PRODUCTION_WORKER}" (found "${productionName ?? "null"}")`);
  }
  if (stagingName !== STAGING_WORKER) {
    errors.push(`Staging Worker name must be "${STAGING_WORKER}" (found "${stagingName ?? "null"}")`);
  }
  if (productionName && stagingName && productionName === stagingName) {
    errors.push("Staging Worker name must differ from production Worker name");
  }

  if (!compatibilityDate) {
    errors.push("Missing compatibility_date in wrangler.jsonc");
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(compatibilityDate)) {
    errors.push(`Invalid compatibility_date "${compatibilityDate}"`);
  }

  for (const binding of REQUIRED_KV_BINDINGS) {
    const id = stagingKv[binding];
    if (!id?.trim()) {
      errors.push(`Staging KV binding "${binding}" is blank`);
    }
  }

  const stagingDoNames = extractBindingNames(stagingBlock, "durable_objects");
  for (const binding of REQUIRED_DO_BINDINGS) {
    if (!stagingDoNames.includes(binding)) {
      errors.push(`Missing staging Durable Object binding "${binding}"`);
    }
  }

  const stagingOrigin = extractQuoted(stagingBlock, "ORIGIN_URL");
  const productionOrigin = extractQuoted(prodSection, "ORIGIN_URL");
  if (stagingOrigin && productionOrigin && stagingOrigin === productionOrigin) {
    errors.push("Staging ORIGIN_URL must differ from production ORIGIN_URL");
  }

  if (stagingCompatibilityDate && !/^\d{4}-\d{2}-\d{2}$/.test(stagingCompatibilityDate)) {
    errors.push(`Invalid staging compatibility_date "${stagingCompatibilityDate}"`);
  }

  return {
    ok: errors.length === 0,
    errors,
    summary: {
      productionWorker: productionName,
      stagingWorker: stagingName,
      compatibilityDate,
      kvBindings: Object.fromEntries(
        REQUIRED_KV_BINDINGS.map((b) => [b, maskId(stagingKv[b])]),
      ),
    },
  };
}

function main() {
  const result = parseWrangler();
  if (result.ok) {
    console.log("STAGING_CONFIG::PASS");
    console.log(`  production_worker: ${result.summary.productionWorker}`);
    console.log(`  staging_worker: ${result.summary.stagingWorker}`);
    console.log(`  compatibility_date: ${result.summary.compatibilityDate}`);
    for (const [binding, masked] of Object.entries(result.summary.kvBindings)) {
      console.log(`  kv.${binding}: ${masked}`);
    }
    process.exit(0);
  }

  console.error("STAGING_CONFIG::FAIL");
  for (const error of result.errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

export { parseWrangler, PRODUCTION_WORKER, STAGING_WORKER, REQUIRED_KV_BINDINGS };

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}

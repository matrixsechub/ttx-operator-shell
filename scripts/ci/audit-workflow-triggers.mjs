#!/usr/bin/env node
/**
 * Static trigger/trust audit for .github/workflows/*.yml
 * Fail-closed on known dangerous patterns for production deploy.
 *
 * Exit 0 = pass, 1 = findings.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const workflowsDir = join(root, ".github", "workflows");

const findings = [];

function fail(file, message) {
  findings.push(`${file}: ${message}`);
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8").replace(/\r\n/g, "\n");
}

const files = readdirSync(workflowsDir)
  .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
  .sort();

for (const name of files) {
  const rel = `.github/workflows/${name}`;
  const text = read(rel);

  // Production deploy must not auto-fire on push to main.
  if (name === "deploy-production.yml") {
    if (/^on:\n(?:  .*\n)*?  push:/m.test(text) || /^on:\n  push:/m.test(text)) {
      // More precise: look for push under on: at top-level triggers
      const onBlock = text.match(/^on:\n([\s\S]*?)(?=\n[a-zA-Z_]|\npermissions:|\nconcurrency:|\njobs:)/m);
      if (onBlock && /^\s+push:/m.test(onBlock[1])) {
        fail(rel, "production deploy must not use on.push (use workflow_run / guarded workflow_dispatch)");
      }
    }
    if (!/workflow_run:/.test(text)) {
      fail(rel, "missing workflow_run trigger for CI-gated deploys");
    }
    if (!/confirm_deploy/.test(text) || !/DEPLOY_PRODUCTION/.test(text)) {
      fail(rel, "manual path must require DEPLOY_PRODUCTION confirmation");
    }
    if (!/DEPLOY_SHA/.test(text)) {
      fail(rel, "must pin deploy to DEPLOY_SHA");
    }
  }

  // Job-level GH_PAT / MSHOPS_CHECKOUT_TOKEN injection is forbidden in reusable PR CI.
  if (
    name === "_reusable-build-test.yml" ||
    name === "_reusable-wrangler-dry-run.yml" ||
    name === "deploy-production.yml"
  ) {
    const jobEnvs = [...text.matchAll(/\n    env:\n([\s\S]*?)\n    steps:\n/g)];
    for (const match of jobEnvs) {
      if (/GH_PAT:|MSHOPS_CHECKOUT_TOKEN:|MSHOPS_TOKEN:/.test(match[1])) {
        fail(rel, "job-level env must not include MSHOPS/GH_PAT credentials");
      }
    }
  }

  // Prefer pinned actions (40-char SHA) for uses: actions/*
  const loose = [...text.matchAll(/uses:\s+(actions\/[^\s@]+)@(?!([0-9a-f]{40}))([^\s]+)/g)];
  for (const m of loose) {
    // allow local ./.github/actions
    fail(rel, `unpinned or floating action ref: ${m[0].trim()}`);
  }
}

if (findings.length) {
  console.error("workflow trigger/trust audit FAILED:");
  for (const f of findings) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(`workflow trigger/trust audit passed (${files.length} workflows)`);

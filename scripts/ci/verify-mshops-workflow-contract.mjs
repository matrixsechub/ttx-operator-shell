#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const CHECKOUT_SHA = "34e114876b0b11c390a56381ad16ebd13914f8d5";
const REQUIRED_TOKEN_SECRET = "MSHOPS_CHECKOUT_TOKEN";

const MSHOPS_CONSUMERS = [
  ".github/workflows/_reusable-build-test.yml",
  ".github/workflows/_reusable-wrangler-dry-run.yml",
  ".github/workflows/staging-deploy.yml",
];

const FORBIDDEN_PATTERNS = [
  /pull_request_target/i,
  /secrets\.GITHUB_TOKEN[\s\S]*matrixsechub\/MSHOPS/,
  /token:\s*\$\{\{\s*secrets\.GITHUB_TOKEN\s*\}\}[\s\S]*matrixsechub\/MSHOPS/,
];

function readText(path) {
  return readFileSync(path, "utf8");
}

export function verifyMshopsWorkflowContract(root = process.cwd()) {
  const errors = [];

  for (const relative of MSHOPS_CONSUMERS) {
    const path = join(root, relative);
    let text;
    try {
      text = readText(path);
    } catch {
      errors.push(`${relative}: file missing`);
      continue;
    }

    if (!text.includes("checkout-mshops")) {
      errors.push(`${relative}: must use ./.github/actions/checkout-mshops`);
    }
    if (!text.includes(REQUIRED_TOKEN_SECRET)) {
      errors.push(`${relative}: must reference secrets.${REQUIRED_TOKEN_SECRET}`);
    }
    if (!text.includes("MSHOPS_ROOT:")) {
      errors.push(`${relative}: must set MSHOPS_ROOT env`);
    }
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(text)) {
        errors.push(`${relative}: forbidden pattern ${pattern}`);
      }
    }
  }

  const ciPath = join(root, ".github", "workflows", "ci.yml");
  const ciText = readText(ciPath);
  if (!ciText.includes("github.event.pull_request.head.repo.full_name == github.repository")) {
    errors.push("ci.yml: missing trusted same-repo PR guard for private checkout jobs");
  }

  const actionPath = join(root, ".github", "actions", "checkout-mshops", "action.yml");
  const actionText = readText(actionPath);
  if (!actionText.includes(`actions/checkout@${CHECKOUT_SHA}`)) {
    errors.push("checkout-mshops action: actions/checkout must be pinned to immutable SHA");
  }
  if (!actionText.includes("persist-credentials: false")) {
    errors.push("checkout-mshops action: persist-credentials must be false");
  }

  const workflowFiles = readdirSync(join(root, ".github", "workflows"))
    .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
    .map((name) => join(root, ".github", "workflows", name));

  for (const path of workflowFiles) {
    const text = readText(path);
    if (/pull_request_target/i.test(text)) {
      errors.push(`${path}: pull_request_target is forbidden`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    consumers: MSHOPS_CONSUMERS,
    checkoutActionSha: CHECKOUT_SHA,
  };
}

import { fileURLToPath } from "node:url";

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
const modulePath = resolve(fileURLToPath(import.meta.url));

if (invokedPath === modulePath) {
  const result = verifyMshopsWorkflowContract();
  if (!result.ok) {
    console.error("MSHOPS_WORKFLOW_CONTRACT::FAIL");
    for (const error of result.errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  console.log("MSHOPS_WORKFLOW_CONTRACT::PASS");
}

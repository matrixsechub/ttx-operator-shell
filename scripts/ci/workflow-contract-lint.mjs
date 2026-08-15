#!/usr/bin/env node
/**
 * Workflow contract lint for launch-hold remediation.
 * Fail-closed checks over .github/workflows + CODEOWNERS.
 * Does not mutate remotes, secrets, or Cloudflare.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const repoRoot = process.cwd();
const workflowsDir = join(repoRoot, ".github", "workflows");
const codeownersPath = join(repoRoot, ".github", "CODEOWNERS");

function read(rel) {
  return readFileSync(join(repoRoot, rel), "utf8").replace(/\r\n/g, "\n");
}

function listWorkflows() {
  return readdirSync(workflowsDir)
    .filter((n) => n.endsWith(".yml") || n.endsWith(".yaml"))
    .map((n) => join(workflowsDir, n));
}

function fail(msg) {
  console.log(`WORKFLOW_CONTRACT::FAIL::${msg}`);
  return false;
}

function pass(msg) {
  console.log(`WORKFLOW_CONTRACT::PASS::${msg}`);
  return true;
}

function checkCodeowners() {
  if (!existsSync(codeownersPath)) {
    return fail("missing .github/CODEOWNERS");
  }
  const text = read(".github/CODEOWNERS");
  const required = [
    ".github/workflows/",
    ".github/actions/",
    "scripts/ci/",
    "msh-ops/beacon/",
  ];
  let ok = true;
  for (const path of required) {
    if (!text.includes(path)) {
      ok = fail(`CODEOWNERS missing rule for ${path}`) && ok;
    }
  }
  if (ok) pass("CODEOWNERS covers workflow/action/ci/beacon paths");
  return ok;
}

function extractJobEnv(yaml) {
  const match = yaml.match(/\n    env:\n([\s\S]*?)\n    steps:\n/);
  return match ? match[1] : "";
}

function checkNoJobWideSecrets(rel) {
  const yaml = read(rel);
  const env = extractJobEnv(yaml);
  if (/GH_PAT:|CLOUDFLARE_API_TOKEN:|ANTHROPIC_API_KEY:|GITHUB_TOKEN:/.test(env)) {
    return fail(`${rel} job env contains privileged secret mapping`);
  }
  return pass(`${rel} job env has no privileged secret mapping`);
}

function checkDeployTriggerTrust() {
  const yaml = read(".github/workflows/deploy-production.yml");
  const onBlock = yaml.split(/\njobs:\n/)[0] ?? yaml;
  let ok = true;
  // Explicit ban: push-to-main auto-deploy (CF Workers Builds bypass is Operator-owned).
  if (/^\s+push:\s*$/m.test(onBlock)) {
    ok = fail("deploy-production must not trigger on push") && ok;
  }
  if (!/workflow_run:/.test(onBlock)) {
    ok = fail("deploy-production missing workflow_run trigger") && ok;
  }
  if (!/workflow_dispatch:/.test(onBlock)) {
    ok = fail("deploy-production missing workflow_dispatch trigger") && ok;
  }
  if (!/github\.event\.workflow_run\.conclusion\s*==\s*'success'/.test(yaml)) {
    ok = fail("deploy-production must require workflow_run conclusion == success") && ok;
  }
  if (!/head_branch\s*==\s*'main'/.test(yaml)) {
    ok = fail("deploy-production must require workflow_run head_branch == main") && ok;
  }
  if (!/confirm_deploy/.test(yaml) || !/DEPLOY_PRODUCTION/.test(yaml)) {
    ok = fail("deploy-production manual path must require DEPLOY_PRODUCTION confirm") && ok;
  }
  if (ok) pass("deploy-production trigger trust (workflow_run success + manual confirm)");
  return ok;
}

function checkTopLevelPermissions() {
  let ok = true;
  for (const filePath of listWorkflows()) {
    const rel = relative(repoRoot, filePath).replace(/\\/g, "/");
    const text = read(rel);
    if (!/^permissions:/m.test(text) && !/\npermissions:/m.test(text)) {
      ok = fail(`${rel} missing top-level permissions`) && ok;
    } else {
      pass(`${rel} has permissions block`);
    }
  }
  return ok;
}

function checkMshopsCloneIsolation() {
  let ok = true;
  for (const rel of [
    ".github/workflows/_reusable-build-test.yml",
    ".github/workflows/_reusable-wrangler-dry-run.yml",
    ".github/workflows/deploy-production.yml",
  ]) {
    const yaml = read(rel);
    if (!/checkout-mshops-artifact/.test(yaml)) {
      ok = fail(`${rel} must use checkout-mshops-artifact`) && ok;
      continue;
    }
    if (!/assert-no-mshops-token\.mjs/.test(yaml)) {
      ok = fail(`${rel} must assert no MSHOPS token after clone`) && ok;
    }
    if (/x-access-token:\$\{\{\s*secrets\.GH_PAT/.test(yaml)) {
      ok = fail(`${rel} must not inline GH_PAT into clone URL`) && ok;
    }
    ok = checkNoJobWideSecrets(rel) && ok;
  }
  return ok;
}

function main() {
  let ok = true;
  ok = checkCodeowners() && ok;
  ok = checkTopLevelPermissions() && ok;
  ok = checkDeployTriggerTrust() && ok;
  ok = checkMshopsCloneIsolation() && ok;
  if (!ok) process.exit(1);
  console.log("WORKFLOW_CONTRACT::PASS::all");
}

main();

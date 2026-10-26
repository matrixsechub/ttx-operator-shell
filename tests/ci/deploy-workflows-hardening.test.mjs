import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const workflowsDir = join(root, ".github", "workflows");

function readWorkflow(name) {
  return readFileSync(join(workflowsDir, name), "utf8").replace(/\r\n/g, "\n");
}

function withoutComments(yaml) {
  return yaml
    .split("\n")
    .map((line) => line.replace(/(^|\s)#.*$/, ""))
    .join("\n");
}

function extractJob(yaml, name) {
  const start = yaml.indexOf(`\n  ${name}:`);
  assert.ok(start >= 0, `${name} job must exist`);
  const fromJob = yaml.slice(start + 1);
  const nextJob = fromJob.slice(1).search(/\n  [a-zA-Z0-9_-]+:/);
  return nextJob === -1 ? fromJob : fromJob.slice(0, nextJob + 1);
}

const production = readWorkflow("deploy-production.yml");
const productionCode = withoutComments(production);

describe("deploy-production workflow", () => {
  it("only runs on manual dispatch (never on push or pull_request)", () => {
    const onBlock = productionCode.slice(productionCode.indexOf("\non:"), productionCode.indexOf("\npermissions:"));
    assert.match(onBlock, /workflow_dispatch:/);
    assert.doesNotMatch(onBlock, /\bpush:/);
    assert.doesNotMatch(onBlock, /pull_request/);
    assert.doesNotMatch(onBlock, /schedule:/);
  });

  it("authorizes with the production phrase and mainline check", () => {
    const job = extractJob(productionCode, "authorize");
    assert.match(job, /DEPLOY_TARGET: production/);
    assert.match(job, /node scripts\/ci\/resolve-deploy-ref\.mjs/);
    assert.match(production, /Type DEPLOY_PRODUCTION to authorize deployment/);
  });

  it("deploys only after authorize, build-test and dry run, inside the production Environment", () => {
    const job = extractJob(productionCode, "deploy-production");
    assert.match(job, /needs: \[authorize, build-test, production-dry-run\]/);
    assert.match(job, /^ {4}environment: production$/m);
    assert.match(job, /run: npm run typecheck/);
    assert.match(job, /run: npm test/);
    const dryRun = job.indexOf("--dry-run");
    const deploy = job.indexOf("run: npx wrangler deploy\n");
    assert.ok(dryRun > 0 && deploy > dryRun, "dry run must precede the real deploy");
    assert.match(extractJob(productionCode, "preflight"), /audit-action-pins\.mjs/);
  });

  it("fails the job when the smoke test does not return 200", () => {
    const job = extractJob(productionCode, "deploy-production");
    const smoke = job.slice(job.indexOf("Smoke test"));
    assert.match(smoke, /= "200"/);
    assert.match(smoke, /exit 1/);
  });

  it("pins every action to a full commit SHA", () => {
    const uses = [...productionCode.matchAll(/uses:\s*([^\s]+)/g)].map((m) => m[1]);
    assert.ok(uses.length > 0);
    for (const ref of uses) {
      if (ref.startsWith("./")) continue;
      assert.match(ref, /@[0-9a-f]{40}$/, `${ref} must be SHA-pinned`);
    }
  });

  it("passes workflow inputs to shell steps only through env", () => {
    // Collect each run: script (inline or block scalar) and reject expressions
    // that splice dispatcher-controlled values straight into the shell.
    const lines = productionCode.split("\n");
    const scripts = [];
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^(\s*)(- )?run:\s*(.*)$/);
      if (!match) continue;
      // Column of the `run` key itself; block-scalar lines are indented past it.
      const keyColumn = match[1].length + (match[2] ? 2 : 0);
      const body = [match[3]];
      while (i + 1 < lines.length && (lines[i + 1].trim() === "" || lines[i + 1].search(/\S/) > keyColumn)) {
        body.push(lines[++i]);
      }
      scripts.push(body.join("\n"));
    }
    assert.ok(scripts.length > 5);
    for (const script of scripts) {
      assert.doesNotMatch(script, /\$\{\{\s*(inputs|github\.event)\./, `inline expression in shell: ${script.trim()}`);
    }
  });
});

describe("public repository runner policy", () => {
  it("no workflow targets a self-hosted runner", () => {
    for (const file of readdirSync(workflowsDir).filter((f) => /\.ya?ml$/.test(f))) {
      const code = withoutComments(readWorkflow(file));
      assert.doesNotMatch(code, /runs-on:[^\n]*self-hosted/, `${file} targets a self-hosted runner`);
    }
  });

  it("runs the scheduled organizer on a GitHub-hosted Windows runner", () => {
    const organizer = withoutComments(readWorkflow("organizer-schedule.yml"));
    assert.match(organizer, /runs-on: windows-latest/);
    assert.doesNotMatch(organizer, /pull_request/);
  });
});

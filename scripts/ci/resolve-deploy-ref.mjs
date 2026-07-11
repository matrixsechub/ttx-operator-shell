#!/usr/bin/env node

import { execSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const CONFIRM_PHRASE = "DEPLOY_STAGING";
export const UNSAFE_REF_PATTERNS = [
  /^pull\//i,
  /^refs\/pull\//i,
  /^refs\/remotes\/pull\//i,
  /^merge\//i,
];

export function validateConfirmDeploy(confirm) {
  if (confirm?.trim() !== CONFIRM_PHRASE) {
    return { ok: false, error: `confirm_deploy must be exactly "${CONFIRM_PHRASE}"` };
  }
  return { ok: true };
}

export function validateTargetRef(targetRef) {
  const ref = targetRef?.trim();
  if (!ref) {
    return { ok: false, error: "target_ref is required" };
  }
  for (const pattern of UNSAFE_REF_PATTERNS) {
    if (pattern.test(ref)) {
      return { ok: false, error: `unsafe target_ref "${ref}"` };
    }
  }
  return { ok: true, ref };
}

export function resolveCommitSha(targetRef, exec = execSync) {
  const refCheck = validateTargetRef(targetRef);
  if (!refCheck.ok) return refCheck;

  try {
    const commitSha = exec(`git rev-parse "${refCheck.ref}^{commit}"`, {
      encoding: "utf8",
    }).trim();
    if (!/^[0-9a-f]{40}$/i.test(commitSha)) {
      return { ok: false, error: `resolved SHA is invalid for ref "${refCheck.ref}"` };
    }
    return { ok: true, ref: refCheck.ref, commitSha };
  } catch {
    return { ok: false, error: `unable to resolve target_ref "${refCheck.ref}" to a commit SHA` };
  }
}

export function authorizeDeployment(confirm, targetRef, exec = execSync) {
  const confirmResult = validateConfirmDeploy(confirm);
  if (!confirmResult.ok) return confirmResult;
  return resolveCommitSha(targetRef, exec);
}

function writeOutputs(requestedRef, commitSha) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;
  appendFileSync(file, `requested_ref=${requestedRef}\n`);
  appendFileSync(file, `commit_sha=${commitSha}\n`);
}

function main() {
  const confirm = process.env.CONFIRM_DEPLOY?.trim() ?? process.argv[2]?.trim();
  const targetRef = process.env.TARGET_REF?.trim() ?? process.argv[3]?.trim() ?? "main";

  const result = authorizeDeployment(confirm, targetRef);
  if (!result.ok) {
    console.error(`DEPLOY_REF::FAIL::${result.error}`);
    process.exit(1);
  }

  console.log(`DEPLOY_REF::PASS::${result.ref}::${result.commitSha}`);
  writeOutputs(result.ref, result.commitSha);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}

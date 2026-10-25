#!/usr/bin/env node

import { execSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const CONFIRM_PHRASE = "DEPLOY_STAGING";
export const CONFIRM_PHRASES = Object.freeze({
  staging: CONFIRM_PHRASE,
  production: "DEPLOY_PRODUCTION",
});
// Production may only ship commits already reviewed into main.
export const MAINLINE_REF = "origin/main";
export const UNSAFE_REF_PATTERNS = [
  /^pull\//i,
  /^refs\/pull\//i,
  /^refs\/remotes\/pull\//i,
  /^merge\//i,
];

export function validateDeployTarget(target) {
  const value = (target ?? "staging").trim();
  if (!Object.hasOwn(CONFIRM_PHRASES, value)) {
    return { ok: false, error: `deploy target must be one of: ${Object.keys(CONFIRM_PHRASES).join(", ")}` };
  }
  return { ok: true, target: value };
}

export function validateConfirmDeploy(confirm, target = "staging") {
  const targetCheck = validateDeployTarget(target);
  if (!targetCheck.ok) return targetCheck;
  const phrase = CONFIRM_PHRASES[targetCheck.target];
  if (confirm?.trim() !== phrase) {
    return { ok: false, error: `confirm_deploy must be exactly "${phrase}"` };
  }
  return { ok: true };
}

export function verifyOnMainline(commitSha, exec = execSync) {
  try {
    exec(`git merge-base --is-ancestor "${commitSha}" "${MAINLINE_REF}"`, { encoding: "utf8" });
    return { ok: true };
  } catch {
    return { ok: false, error: `commit ${commitSha} is not on ${MAINLINE_REF}; production deploys only reviewed main commits` };
  }
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
  // The ref is interpolated into a shell command; allow git-ref characters only.
  if (!/^[A-Za-z0-9._/-]{1,200}$/.test(ref) || ref.includes("..")) {
    return { ok: false, error: `unsafe target_ref "${ref}"` };
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

export function authorizeDeployment(confirm, targetRef, exec = execSync, target = "staging") {
  const confirmResult = validateConfirmDeploy(confirm, target);
  if (!confirmResult.ok) return confirmResult;
  const resolved = resolveCommitSha(targetRef, exec);
  if (!resolved.ok || target !== "production") return resolved;
  const mainline = verifyOnMainline(resolved.commitSha, exec);
  return mainline.ok ? resolved : mainline;
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
  const deployTarget = process.env.DEPLOY_TARGET?.trim() || "staging";

  const result = authorizeDeployment(confirm, targetRef, execSync, deployTarget);
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

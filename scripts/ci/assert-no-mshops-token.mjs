#!/usr/bin/env node
/**
 * Fail closed if a MSHOPS clone credential is visible to the current process
 * under any known name — not only GH_PAT.
 *
 * Composite action inputs are not auto-exported as INPUT_* (actions/runner#665),
 * but a later composite step must still reject INPUT_TOKEN if a runner or
 * env: ${{ inputs }} mapping ever leaked inputs.token.
 *
 * GITHUB_TOKEN is the default Actions token for this repo and is allowed.
 */
const FORBIDDEN = [
  "GH_PAT",
  "MSHOPS_TOKEN",
  "MSHOPS_CHECKOUT_TOKEN",
  "INPUT_TOKEN",
  "INPUT_GH_PAT",
  "INPUT_MSHOPS_TOKEN",
];

let failed = false;
for (const key of FORBIDDEN) {
  const value = process.env[key];
  if (typeof value === "string" && value.trim().length > 0) {
    console.error(
      `ERROR: ${key} is visible to this step (credential must be clone-step-scoped only)`,
    );
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log("OK: no MSHOPS credential env vars visible to this step");

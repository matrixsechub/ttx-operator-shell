#!/usr/bin/env node
/**
 * Fail closed if MSHOPS credential env vars are visible to the current process.
 * Used after the dedicated clone step to prove later CI steps cannot read GH_PAT.
 */
const FORBIDDEN = ["GH_PAT", "MSHOPS_TOKEN", "MSHOPS_CHECKOUT_TOKEN"];

let failed = false;
for (const key of FORBIDDEN) {
  const value = process.env[key];
  if (typeof value === "string" && value.trim().length > 0) {
    console.error(`ERROR: ${key} is visible to this step (credential must be clone-step-scoped only)`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log("OK: no MSHOPS credential env vars visible to this step");

#!/usr/bin/env node
import { runStagingTriageSmoke } from "./staging/triageSmoke.ts";

const proof = await runStagingTriageSmoke({
  runId: process.env.PRISM_STAGING_RUN_ID,
  originInput: process.env.PRISM_STAGING_ORIGIN,
  expectedBuildSha: process.env.PRISM_STAGING_EXPECTED_SHA,
});

console.log(JSON.stringify({ ok: proof.passed, runId: proof.runId, evidenceHash: proof.evidenceHash }));
process.exitCode = proof.passed ? 0 : 1;

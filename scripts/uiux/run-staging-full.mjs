#!/usr/bin/env node
import { runStagingValidation } from "./staging/runFull.ts";

const result = await runStagingValidation({
  runId: process.env.PRISM_STAGING_RUN_ID,
  skipSubmission: process.env.PRISM_STAGING_SKIP_SUBMISSION === "true",
  dryRun: process.env.PRISM_CAPTURE_DRY_RUN === "true",
});

console.log(JSON.stringify({ ok: result.passed, runId: result.runId, captureId: result.captureId }));

#!/usr/bin/env node
import { runStagingPreflight } from "./staging/preflight.ts";
import { resolveStagingTarget } from "./staging/targetPolicy.ts";

const target = resolveStagingTarget(process.env.PRISM_STAGING_ORIGIN);
const preflight = await runStagingPreflight(target.origin);
console.log(JSON.stringify({ ok: preflight.passed, runId: preflight.evidenceHash.slice(0, 12) }));
if (!preflight.passed) process.exit(1);

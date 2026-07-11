#!/usr/bin/env node
import { join } from "node:path";
import { scanArtifactDirectory } from "./staging/verify.ts";

const runId = process.argv[2] ?? process.env.PRISM_STAGING_RUN_ID;
const root = runId
  ? join(process.cwd(), "artifacts", "uiux", "staging", runId)
  : join(process.cwd(), "artifacts", "uiux", "staging");

const result = scanArtifactDirectory(root);
console.log(JSON.stringify({ ok: result.ok, scanned: result.scanned, violations: result.violations.length }));
if (!result.ok) process.exit(1);

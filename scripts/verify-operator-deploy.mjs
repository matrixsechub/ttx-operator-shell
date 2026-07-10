#!/usr/bin/env node
/**
 * Deployment verification for operator-shell handoff and MSHOPS beta gates.
 *
 * Usage:
 *   node scripts/verify-operator-deploy.mjs [--handoff|--beta|--all] [baseUrl] [expectedCommitSha]
 *   npm run verify:deploy:handoff -- <baseUrl> <expectedCommitSha>
 */
import {
  parseVerifyOperatorDeployArgs,
  printVerifyOperatorDeployHelp,
} from "./lib/verifyOperatorDeployArgs.mjs";
import { runVerifyOperatorDeploy } from "./lib/verifyOperatorDeploy.mjs";

let config;
try {
  config = parseVerifyOperatorDeployArgs(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  printVerifyOperatorDeployHelp();
  process.exit(2);
}

if (config.help) {
  printVerifyOperatorDeployHelp();
  process.exit(0);
}

const report = await runVerifyOperatorDeploy({
  mode: config.mode,
  baseUrl: config.baseUrl,
  expectedCommit: config.expectedCommit,
});

console.log(
  JSON.stringify(
    {
      mode: report.mode,
      base: report.base,
      environment: report.environment,
      expectedCommitSha: report.expectedCommitSha,
      observedCommitSha: report.observedCommitSha,
      deploymentStatus: report.deploymentStatus,
      systemMode: report.systemMode,
      systemHealth: report.systemHealth,
      failedChecks: report.failedChecks,
      handoffFailedChecks: report.handoffFailedChecks,
      betaFailedChecks: report.betaFailedChecks,
      buildInfo: report.buildInfo,
      engineHealth: report.engineHealth,
      engineVersion: report.engineVersion,
      protectedApis: report.protectedApis,
      systemStatus: report.systemStatus,
      routes: report.routes,
      checks: report.checks,
    },
    null,
    2,
  ),
);

if (report.failedChecks.length > 0) {
  console.error(
    `[verify-operator-deploy] mode=${report.mode} environment=${report.environment} failed: ${report.failedChecks.join(", ")}`,
  );
}

process.exit(report.failedChecks.length === 0 ? 0 : 1);

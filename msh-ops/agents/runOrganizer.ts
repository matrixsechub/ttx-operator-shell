#!/usr/bin/env node
import { appendFileSync, mkdirSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { join } from "node:path";
import { runOrganizerAnalysis } from "./OrganizerAgent.ts";
import {
  createRefactorDecisionLog,
  evaluateRefactorApproval,
} from "../governance/approveRefactor.ts";
import { applyRefactorPlan, planFromSuggestionIds } from "./refactorEngine.ts";

function parseArgs(argv: string[]): {
  dryRun: boolean;
  apply: boolean;
  approveAll: boolean;
  json: boolean;
  repoRoot: string;
} {
  const flags = new Set(argv);
  return {
    dryRun: !flags.has("--apply") && !flags.has("--approve-all"),
    apply: flags.has("--apply"),
    approveAll: flags.has("--approve-all"),
    json: flags.has("--json"),
    repoRoot: process.cwd(),
  };
}

function printReport(report: Awaited<ReturnType<typeof runOrganizerAnalysis>>): void {
  console.log(`\nOrganizerAgent — ${report.mode} report`);
  console.log(`Repo: ${report.repoRoot}`);
  console.log(`Scanned: ${report.scannedAt}`);
  console.log(
    `Summary: ${report.summary.errorCount} errors, ${report.summary.warnCount} warnings, ${report.summary.infoCount} info, ${report.summary.suggestionCount} suggestions, ${report.summary.cycleCount} import cycles\n`,
  );

  const bySeverity = { error: report.issues.filter((i) => i.severity === "error"), warn: report.issues.filter((i) => i.severity === "warn"), info: report.issues.filter((i) => i.severity === "info") };

  for (const [label, issues] of Object.entries(bySeverity)) {
    if (issues.length === 0) continue;
    console.log(`=== ${label.toUpperCase()} (${issues.length}) ===`);
    for (const issue of issues) {
      console.log(`  [${issue.ruleId}] ${issue.relativePath}`);
      console.log(`    ${issue.message}`);
      if (issue.details) console.log(`    ${issue.details}`);
    }
    console.log();
  }

  if (report.suggestions.length > 0) {
    console.log(`=== SUGGESTED FIXES (${report.suggestions.length}) ===`);
    for (const s of report.suggestions) {
      const target = s.targetPath ? ` → ${s.targetPath}` : "";
      console.log(`  ${s.id} [${s.action}] ${s.relativePath}${target}`);
      console.log(`    ${s.description}`);
    }
    console.log();
  }
}

async function promptApproval(suggestionIds: string[]): Promise<string[]> {
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(
      "Approve suggestion IDs (comma-separated) or 'none': ",
    );
    const trimmed = answer.trim();
    if (!trimmed || trimmed.toLowerCase() === "none") return [];
    return trimmed
      .split(",")
      .map((s) => s.trim())
      .filter((id) => suggestionIds.includes(id));
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const report = await runOrganizerAnalysis(args.repoRoot);

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
    if (args.dryRun) return;
  } else {
    printReport(report);
  }

  if (args.dryRun) {
    console.log("Dry run complete. Use --apply to approve and apply fixes.");
    return;
  }

  if (report.suggestions.length === 0) {
    console.log("No suggestions to apply.");
    return;
  }

  const allIds = report.suggestions.map((s) => s.id);
  const approvedIds = args.approveAll ? allIds : await promptApproval(allIds);

  const approval = evaluateRefactorApproval({
    agentId: "OrganizerAgent",
    suggestionIds: approvedIds,
    description: "OrganizerAgent structural refactor",
    operatorApproval: approvedIds.length > 0,
  });

  const log = createRefactorDecisionLog();
  log.append(
    {
      agentId: "OrganizerAgent",
      suggestionIds: approvedIds,
      description: "OrganizerAgent structural refactor",
      operatorApproval: approvedIds.length > 0,
    },
    approval,
  );

  const artifactsDir = join(args.repoRoot, ".artifacts");
  mkdirSync(artifactsDir, { recursive: true });
  appendFileSync(join(artifactsDir, "organizer-decisions.jsonl"), log.toJsonl(), "utf8");

  if (approval.decision !== "approved") {
    console.log(`Refactor denied: ${approval.reason}`);
    return;
  }

  const plan = planFromSuggestionIds(report.suggestions, approvedIds);
  const result = await applyRefactorPlan(args.repoRoot, plan, approval);

  console.log("\n=== REFACTOR RESULT ===");
  console.log(`Applied: ${result.applied.length} file(s)`);
  if (result.skipped.length > 0) console.log(`Skipped: ${result.skipped.join("; ")}`);
  if (result.errors.length > 0) console.log(`Errors: ${result.errors.join("; ")}`);
  console.log("\nRecommend running: npm run typecheck");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

/**
 * Cross-platform CLI argument parsing for verify-operator-deploy.
 * Supports npm run verify:deploy:handoff -- <url> <sha> on Windows, bash, and CI.
 */

const DEFAULT_BASE = "https://ttx-operator-shell.sogellagepul.workers.dev";

/**
 * @typedef {"handoff" | "beta" | "all"} VerifyMode
 */

/**
 * @param {string[]} argv process.argv.slice(2)
 * @returns {{ mode: VerifyMode, baseUrl: string, expectedCommit: string | null, help: boolean }}
 */
export function parseVerifyOperatorDeployArgs(argv) {
  let mode = "handoff";
  let baseUrl = DEFAULT_BASE;
  let expectedCommit = null;
  let help = false;

  const positionals = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }

    if (arg === "--handoff") {
      mode = "handoff";
      continue;
    }

    if (arg === "--beta") {
      mode = "beta";
      continue;
    }

    if (arg === "--all") {
      mode = "all";
      continue;
    }

    if (arg === "--mode") {
      const value = argv[++i]?.trim().toLowerCase();
      if (value === "handoff" || value === "beta" || value === "all") {
        mode = value;
      } else {
        throw new Error(`Invalid --mode value "${value ?? ""}". Use handoff, beta, or all.`);
      }
      continue;
    }

    if (arg.startsWith("--mode=")) {
      const value = arg.slice("--mode=".length).trim().toLowerCase();
      if (value === "handoff" || value === "beta" || value === "all") {
        mode = value;
      } else {
        throw new Error(`Invalid --mode value "${value}". Use handoff, beta, or all.`);
      }
      continue;
    }

    if (arg === "--base-url" || arg === "--base") {
      const value = argv[++i]?.trim();
      if (!value) throw new Error("Missing value for --base-url");
      baseUrl = value.replace(/\/$/, "");
      continue;
    }

    if (arg.startsWith("--base-url=") || arg.startsWith("--base=")) {
      const prefix = arg.startsWith("--base-url=") ? "--base-url=" : "--base=";
      baseUrl = arg.slice(prefix.length).trim().replace(/\/$/, "");
      continue;
    }

    if (arg === "--commit" || arg === "--sha") {
      const value = argv[++i]?.trim();
      if (!value) throw new Error("Missing value for --commit");
      expectedCommit = value;
      continue;
    }

    if (arg.startsWith("--commit=") || arg.startsWith("--sha=")) {
      const prefix = arg.startsWith("--commit=") ? "--commit=" : "--sha=";
      expectedCommit = arg.slice(prefix.length).trim();
      continue;
    }

    if (arg === "--") {
      positionals.push(...argv.slice(i + 1));
      break;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    positionals.push(arg);
  }

  if (positionals[0]) {
    baseUrl = positionals[0].replace(/\/$/, "");
  }
  if (positionals[1]) {
    expectedCommit = positionals[1].trim();
  }

  return { mode, baseUrl, expectedCommit: expectedCommit || null, help };
}

export function printVerifyOperatorDeployHelp() {
  console.log(`Usage:
  node scripts/verify-operator-deploy.mjs [options] [baseUrl] [expectedCommitSha]

Modes (default: --handoff):
  --handoff          Operator-shell release handoff gate (production promotion)
  --beta             Full MSHOPS beta gate (storefront, ghost, governance, session)
  --all              Run handoff then beta checks

Options:
  --base-url <url>   Deployment base URL (default: ${DEFAULT_BASE})
  --commit <sha>     Expected /api/build-info commitSha
  --mode <handoff|beta|all>
  -h, --help         Show this help

Examples:
  npm run verify:deploy:handoff -- https://ttx-operator-shell.sogellagepul.workers.dev <sha>
  node scripts/verify-operator-deploy.mjs --handoff --commit <sha>
  node scripts/verify-operator-deploy.mjs --beta https://ttx-operator-shell-staging.sogellagepul.workers.dev
`);
}

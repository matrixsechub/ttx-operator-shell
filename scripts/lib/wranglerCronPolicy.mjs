import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const WRANGLER_CONFIGS = [
  { label: "production", path: "wrangler.jsonc", env: null },
  { label: "staging", path: "wrangler.jsonc", env: "staging" },
  { label: "mshops-public", path: "wrangler.mshops-public.jsonc", env: null },
  { label: "mshops-operator", path: "wrangler.mshops-operator.jsonc", env: null },
];

const DOCUMENTED_SCHEDULED_WORKLOADS = [
  {
    id: "organizer-agent",
    interval: "GitHub Actions cron 0 12 * * * (daily)",
    handler: "scripts/run-organizer-scheduled.mjs",
    runtime: "github-actions",
  },
];

function extractEnvBlock(raw, envName) {
  const pattern = new RegExp(`"${envName}"\\s*:\\s*\\{`);
  const match = pattern.exec(raw);
  if (!match) return null;

  let depth = 0;
  let started = false;
  for (let i = match.index; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "{") {
      depth += 1;
      started = true;
    } else if (ch === "}") {
      depth -= 1;
      if (started && depth === 0) {
        return raw.slice(match.index, i + 1);
      }
    }
  }
  return null;
}

function extractCronExpressions(section) {
  const triggersBlock =
    section.match(/"triggers"\s*:\s*\{[\s\S]*?"crons"\s*:\s*\[([\s\S]*?)\]/m)?.[1] ?? "";
  const crons = [];
  for (const match of triggersBlock.matchAll(/"([^"]+)"/g)) {
    crons.push(match[1]);
  }
  return crons;
}

export function readWranglerCronConfig(configPath, env = null) {
  const absolutePath = join(root, configPath);
  const raw = readFileSync(absolutePath, "utf8");
  const section = env ? extractEnvBlock(raw, env) ?? "" : raw.split('"env"')[0];
  return {
    configPath,
    env,
    crons: extractCronExpressions(section),
  };
}

export function readAllWranglerCronConfigs() {
  return WRANGLER_CONFIGS.map((entry) => readWranglerCronConfig(entry.path, entry.env)).map(
    (config, index) => ({
      label: WRANGLER_CONFIGS[index].label,
      ...config,
    }),
  );
}

export function workerExportsScheduledHandler(workerEntryPath = join(root, "worker", "index.ts")) {
  const source = readFileSync(workerEntryPath, "utf8");
  const defaultExport = source.match(/export\s+default\s*\{([\s\S]*?)\}\s*satisfies/s)?.[1] ?? "";
  return /\bscheduled\s*\(/.test(defaultExport) || /\basync\s+scheduled\s*\(/.test(defaultExport);
}

export function validateCronTriggerPolicy(options = {}) {
  const configs = options.configs ?? readAllWranglerCronConfigs();
  const exportsScheduled = options.exportsScheduled ?? workerExportsScheduledHandler(options.workerEntryPath);
  const errors = [];
  const warnings = [];

  const configuredCrons = configs.flatMap((config) =>
    config.crons.map((cron) => ({ label: config.label, cron })),
  );

  if (configuredCrons.length > 0 && !exportsScheduled) {
    for (const entry of configuredCrons) {
      errors.push(
        `Wrangler config "${entry.label}" declares cron "${entry.cron}" but worker/index.ts does not export scheduled()`,
      );
    }
  }

  if (exportsScheduled && configuredCrons.length === 0) {
    errors.push(
      "worker/index.ts exports scheduled() but no Wrangler triggers.crons are configured — add triggers or remove scheduled()",
    );
  }

  for (const config of configs) {
    if (config.crons.some((cron) => cron === "*/5 * * * *")) {
      errors.push(
        `Orphaned five-minute cron "${config.label}" must remain disabled until an authorized scheduled workload is documented`,
      );
    }
  }

  const production = configs.find((config) => config.label === "production");
  const staging = configs.find((config) => config.label === "staging");
  if (production && staging && production.crons.join() !== staging.crons.join()) {
    warnings.push("Production and staging cron arrays differ — verify intentional environment isolation");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    exportsScheduled,
    configuredCrons,
    documentedScheduledWorkloads: DOCUMENTED_SCHEDULED_WORKLOADS,
    configs: configs.map((config) => ({
      label: config.label,
      configPath: config.configPath,
      env: config.env,
      crons: config.crons,
    })),
  };
}

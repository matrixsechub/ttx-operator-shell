import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const WRANGLER_CONFIGS = [
  { label: "production", configPath: "wrangler.jsonc", env: null },
  { label: "staging", configPath: "wrangler.jsonc", env: "staging" },
  { label: "mshops-operator", configPath: "wrangler.mshops-operator.jsonc", env: null },
  { label: "mshops-public", configPath: "wrangler.mshops-public.jsonc", env: null },
];

function parseCrons(configText, envName) {
  let scope = configText;
  if (envName) {
    const envMatch = scope.match(new RegExp(`"${envName}"\\s*:\\s*\\{`));
    if (!envMatch) return [];
    const start = envMatch.index ?? 0;
    const envSection = scope.slice(start);
    const cronMatch = envSection.match(/"crons"\s*:\s*(\[[^\]]*\])/);
    if (!cronMatch) return [];
    return JSON.parse(cronMatch[1]);
  }

  const envIdx = scope.indexOf('"env"');
  const head = envIdx >= 0 ? scope.slice(0, envIdx) : scope;
  const cronMatch = head.match(/"triggers"\s*:\s*\{[\s\S]*?"crons"\s*:\s*(\[[^\]]*\])/);
  if (!cronMatch) return [];
  return JSON.parse(cronMatch[1]);
}

export function readAllWranglerCronConfigs(root = process.cwd()) {
  return WRANGLER_CONFIGS.map((entry) => {
    const configPath = join(root, entry.configPath);
    const configText = readFileSync(configPath, "utf8");
    return {
      ...entry,
      configPath: entry.configPath,
      crons: parseCrons(configText, entry.env),
    };
  });
}

export function workerExportsScheduledHandler(root = process.cwd()) {
  const workerDir = join(root, "worker");
  const stack = [workerDir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".js")) continue;
      const text = readFileSync(full, "utf8");
      if (/\bscheduled\s*\(/.test(text) || /export\s+async\s+function\s+scheduled\b/.test(text)) {
        return true;
      }
    }
  }
  return false;
}

export function validateCronTriggerPolicy(input = {}) {
  const root = input.root ?? process.cwd();
  const configs = input.configs ?? readAllWranglerCronConfigs(root);
  const exportsScheduled = input.exportsScheduled ?? workerExportsScheduledHandler(root);
  const configuredCrons = configs.flatMap((config) =>
    config.crons.map((cron) => ({ cron, label: config.label, configPath: config.configPath })),
  );
  const errors = [];

  if (configuredCrons.length > 0 && !exportsScheduled) {
    errors.push(
      `Wrangler declares crons (${configuredCrons.map((entry) => entry.cron).join(", ")}) but worker does not export scheduled()`,
    );
  }

  if (exportsScheduled && configuredCrons.length === 0) {
    errors.push("Worker exports scheduled() but no Wrangler triggers.crons are configured");
  }

  return {
    ok: errors.length === 0,
    errors,
    exportsScheduled,
    configuredCrons,
    configs,
  };
}

#!/usr/bin/env node

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateCronTriggerPolicy } from "../lib/wranglerCronPolicy.mjs";

export function verifyCronTriggers() {
  const result = validateCronTriggerPolicy();
  if (!result.ok) {
    console.error("CRON_TRIGGER_POLICY::FAIL");
    for (const error of result.errors) console.error(`  - ${error}`);
    return { ok: false, ...result };
  }
  console.log("CRON_TRIGGER_POLICY::PASS");
  return { ok: true, ...result };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
const modulePath = resolve(fileURLToPath(import.meta.url));

if (invokedPath === modulePath) {
  const result = verifyCronTriggers();
  if (!result.ok) process.exit(1);
}

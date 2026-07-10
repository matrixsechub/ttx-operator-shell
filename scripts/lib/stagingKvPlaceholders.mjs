import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Reserved placeholder IDs in wrangler.jsonc until real namespaces are created. */
export const STAGING_KV_PLACEHOLDER_IDS = new Set([
  "a0000000000000000000000000000001",
  "a0000000000000000000000000000002",
  "a0000000000000000000000000000003",
  "a0000000000000000000000000000004",
]);

const REQUIRED_BINDINGS = ["AUTH_REVOCATION", "WEBHOOK_EVENTS", "SECURITY_EVENTS", "TTX_STATE"];

export function extractKvBindings(section) {
  const bindings = {};
  const pattern = /"binding":\s*"([^"]+)"\s*,\s*"id":\s*"([^"]+)"/g;
  for (const match of section.matchAll(pattern)) {
    bindings[match[1]] = match[2];
  }
  return bindings;
}

export function readWranglerKvBindings(wranglerPath = join(root, "wrangler.jsonc")) {
  const raw = readFileSync(wranglerPath, "utf8");
  const prodSection = raw.split('"env"')[0];
  const stagingBlock = raw.match(/"staging"\s*:\s*\{[\s\S]*?\n\s*\}\s*\n\s*\}/)?.[0] ?? "";
  return {
    production: extractKvBindings(prodSection),
    staging: extractKvBindings(stagingBlock),
  };
}

/**
 * @returns {{ ok: true } | { ok: false, errors: string[] }}
 */
export function validateStagingKvConfig(bindings = readWranglerKvBindings()) {
  const errors = [];

  for (const binding of REQUIRED_BINDINGS) {
    const prodId = bindings.production[binding];
    const stagingId = bindings.staging[binding];

    if (!stagingId) {
      errors.push(`Missing staging KV binding "${binding}" in wrangler.jsonc env.staging.kv_namespaces.`);
      continue;
    }

    if (STAGING_KV_PLACEHOLDER_IDS.has(stagingId)) {
      errors.push(
        `Staging KV "${binding}" still uses placeholder id ${stagingId}. Create a namespace with "wrangler kv namespace create ${binding} --env staging" and paste the returned id into wrangler.jsonc.`,
      );
    }

    if (prodId && stagingId === prodId) {
      errors.push(`Staging KV "${binding}" shares production namespace id ${prodId}. Staging must use a dedicated namespace.`);
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

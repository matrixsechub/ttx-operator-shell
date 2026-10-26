import { existsSync } from "node:fs";
import { join } from "node:path";

/** Marker carried by the CI sample storefront; deploy guards reject it. */
export const FIXTURE_MARKER = 'name="mshops-storefront-fixture"';

export function fixtureBuildDir(root) {
  return join(root, "fixtures", "mshops-storefront", "build-final");
}

/**
 * Local storefront candidates, in priority order. The CI sample is used only
 * when MSHOPS_STOREFRONT=fixture is set explicitly — never as a fallback.
 * Returns null when nothing local is usable (build.mjs then clones MSHOPS).
 *
 * @param {string} root
 * @param {Record<string, string | undefined>} env
 * @returns {{ dir: string, fixture: boolean } | null}
 */
export function resolveLocalStorefront(root, env = process.env) {
  const mode = env.MSHOPS_STOREFRONT?.trim();
  if (mode === "fixture") {
    const dir = fixtureBuildDir(root);
    if (!existsSync(join(dir, "app", "index.html"))) {
      throw new Error(`MSHOPS_STOREFRONT=fixture but ${dir}/app/index.html is missing`);
    }
    return { dir, fixture: true };
  }
  if (mode) {
    throw new Error(`Unknown MSHOPS_STOREFRONT "${mode}" (only "fixture" is supported)`);
  }

  const candidates = [
    env.MSHOPS_BUILD_DIR?.trim(),
    join(root, "..", "MSHOPS", "build-final"),
    join(root, ".deps", "MSHOPS", "build-final"),
  ].filter(Boolean);
  for (const dir of candidates) {
    if (existsSync(join(dir, "app", "index.html"))) return { dir, fixture: false };
  }
  return null;
}

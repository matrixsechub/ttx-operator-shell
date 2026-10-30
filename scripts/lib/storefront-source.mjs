import { existsSync } from "node:fs";
import { join } from "node:path";

/** Marker carried by the CI sample storefront; deploy guards reject it. */
export const FIXTURE_MARKER = 'name="mshops-storefront-fixture"';

export function fixtureBuildDir(root) {
  return join(root, "fixtures", "mshops-storefront", "build-final");
}

/**
 * Local storefront candidates. The CI sample is used only when
 * MSHOPS_STOREFRONT=fixture is set explicitly — never as a fallback, and never
 * together with MSHOPS_BUILD_DIR. An explicit MSHOPS_BUILD_DIR is the deploy
 * artifact and must exist; it does not fall through to a sibling checkout.
 * Returns null when nothing local is usable (build.mjs then clones MSHOPS).
 *
 * @param {string} root
 * @param {Record<string, string | undefined>} env
 * @returns {{ dir: string, fixture: boolean } | null}
 */
export function resolveLocalStorefront(root, env = process.env) {
  const mode = env.MSHOPS_STOREFRONT?.trim();
  const explicit = env.MSHOPS_BUILD_DIR?.trim();
  if (mode === "fixture") {
    if (explicit) {
      throw new Error("MSHOPS_STOREFRONT=fixture cannot be combined with MSHOPS_BUILD_DIR");
    }
    const dir = fixtureBuildDir(root);
    if (!existsSync(join(dir, "app", "index.html"))) {
      throw new Error(`MSHOPS_STOREFRONT=fixture but ${dir}/app/index.html is missing`);
    }
    return { dir, fixture: true };
  }
  if (mode) {
    throw new Error(`Unknown MSHOPS_STOREFRONT "${mode}" (only "fixture" is supported)`);
  }

  if (explicit) {
    if (!existsSync(join(explicit, "app", "index.html"))) {
      throw new Error(`MSHOPS_BUILD_DIR is set but ${explicit}/app/index.html is missing`);
    }
    return { dir: explicit, fixture: false };
  }

  const candidates = [
    join(root, "..", "MSHOPS", "build-final"),
    join(root, ".deps", "MSHOPS", "build-final"),
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, "app", "index.html"))) return { dir, fixture: false };
  }
  return null;
}

/**
 * Workers Builds checks out this repo and runs `npm run build` on every branch,
 * including pull requests. That path must not clone or discover the private
 * MSHOPS storefront. Preview builds set MSHOPS_STOREFRONT=fixture. Real
 * artifacts are cloned only in the gated GitHub deploy jobs.
 *
 * @param {{ dir: string, fixture: boolean } | null} local
 * @param {Record<string, string | undefined>} env
 */
export function assertWorkersCiStorefront(local, env = process.env) {
  if (env.WORKERS_CI !== "1") return;
  if (local?.fixture) return;
  if (local && env.MSHOPS_BUILD_DIR?.trim()) return;
  throw new Error(
    "Refusing to clone or discover MSHOPS inside Workers Builds. Set MSHOPS_STOREFRONT=fixture for previews. Real storefront deploys stay in the gated GitHub workflow.",
  );
}

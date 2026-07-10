#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mshopsBuild = join(root, "..", "MSHOPS", "build-final");
const dist = join(root, "dist");
const publicDir = join(root, "public");

function assertExists(path, label) {
  if (!existsSync(path)) {
    throw new Error(`${label} not found at ${path}. Run MSHOPS build-pages-final first.`);
  }
}

assertExists(join(mshopsBuild, "app", "index.html"), "MSHOPS storefront shell");
assertExists(join(mshopsBuild, "app", "assets"), "MSHOPS storefront assets");

function clearDist(distPath) {
  if (!existsSync(distPath)) {
    mkdirSync(distPath, { recursive: true });
    return;
  }

  for (const entry of readdirSync(distPath)) {
    if (entry === ".storefront-manifest.json") continue;
    const target = join(distPath, entry);
    try {
      rmSync(target, { recursive: true, force: true });
    } catch {
      // Windows file locks: overwrite via copy below.
    }
  }
}

clearDist(dist);
mkdirSync(dist, { recursive: true });

cpSync(join(mshopsBuild, "app"), join(dist, "app"), { recursive: true });

const shellHtml = readFileSync(join(mshopsBuild, "index.html"), "utf8");
writeFileSync(join(dist, "index.html"), shellHtml);

if (existsSync(join(publicDir, "favicon.svg"))) {
  cpSync(join(publicDir, "favicon.svg"), join(dist, "favicon.svg"));
}

const manifest = {
  assembledAt: new Date().toISOString(),
  source: "scripts/assemble-storefront-dist.mjs",
  mshopsBuild,
  shellTitle: shellHtml.match(/<title>([^<]+)/)?.[1] ?? "unknown",
  bundle: shellHtml.match(/\/app\/assets\/[^"']+/)?.[0] ?? "missing",
};

writeFileSync(join(dist, ".storefront-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log("Storefront dist assembled:", manifest);

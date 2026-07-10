#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";

import { dirname, join } from "node:path";

import { fileURLToPath } from "node:url";



const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const mshopsBuild = join(root, "..", "MSHOPS", "build-final");

const dist = join(root, "dist");

const publicDir = join(root, "public");

const staging = join(root, ".operator-staging");



function assertExists(path, label) {

  if (!existsSync(path)) {

    throw new Error(`${label} not found at ${path}`);

  }

}



assertExists(join(mshopsBuild, "app", "index.html"), "MSHOPS storefront shell");

assertExists(join(mshopsBuild, "app", "assets"), "MSHOPS storefront assets");

assertExists(join(dist, "ecosystem.html"), "ecosystem vite build (run vite build first)");

assertExists(join(dist, "cockpit.html"), "cockpit vite build (run vite build first)");

assertExists(join(dist, "auth.html"), "auth vite build");

assertExists(join(dist, "council.html"), "council vite build");

assertExists(join(dist, "assets"), "cockpit vite assets");



const ecosystemShell = readFileSync(join(dist, "ecosystem.html"), "utf8");



rmSync(staging, { recursive: true, force: true });

mkdirSync(staging, { recursive: true });



// Stage vite outputs before clearing dist.

cpSync(join(dist, "assets"), join(staging, "assets"), { recursive: true });

cpSync(join(dist, "ecosystem.html"), join(staging, "ecosystem.html"));

cpSync(join(dist, "cockpit.html"), join(staging, "cockpit.html"));

cpSync(join(dist, "auth.html"), join(staging, "auth.html"));

cpSync(join(dist, "council.html"), join(staging, "council.html"));



function clearDist(distPath) {

  if (!existsSync(distPath)) {

    mkdirSync(distPath, { recursive: true });

    return;

  }



  for (const entry of readdirSync(distPath)) {

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

cpSync(join(staging, "assets"), join(dist, "assets"), { recursive: true });



renameSync(join(staging, "ecosystem.html"), join(dist, "ecosystem-shell.html"));

renameSync(join(staging, "cockpit.html"), join(dist, "operator-shell.html"));

renameSync(join(staging, "auth.html"), join(dist, "auth-shell.html"));

renameSync(join(staging, "council.html"), join(dist, "council-shell.html"));



writeFileSync(join(dist, "index.html"), ecosystemShell);



if (existsSync(join(publicDir, "favicon.svg"))) {

  cpSync(join(publicDir, "favicon.svg"), join(dist, "favicon.svg"));

}



rmSync(staging, { recursive: true, force: true });



const manifest = {

  assembledAt: new Date().toISOString(),

  source: "scripts/assemble-public-dist.mjs",

  surfaces: {

    ecosystem: { shell: "/ecosystem-shell.html", routes: ["/"] },

    storefront: { shell: "/app/index.html", routes: ["/marketplace", "/storefront", "/enter"] },

    cockpit: { shell: "/operator-shell.html", routes: ["/ops/*", "/systems", "/dashboard", "/ttx", "/divisions", "/future"] },

    auth: { shell: "/auth-shell.html", routes: ["/login"] },

    governance: { shell: "/council-shell.html", routes: ["/council"] },

  },

  canonicalEntry: "https://ttx-operator-shell.sogellagepul.workers.dev",

};



writeFileSync(join(dist, ".public-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log("Public dist assembled:", manifest);


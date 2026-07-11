import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { restoreViteShells, stageViteShells, VITE_SHELL_FILES } from "../../scripts/lib/viteShellStaging.mjs";

const VALID_ECOSYSTEM = '<html><head><title>MSH OPS // Ecosystem Entry</title></head><body><div id="root"></div></body></html>';
const STATIC_OVERVIEW = '<html><head><title>MSH OPS | Ecosystem Overview</title></head><body><h1>Overview</h1></body></html>';

function createProjectRoot() {
  const projectRoot = mkdtempSync(join(tmpdir(), "vite-shell-staging-"));
  const dist = join(projectRoot, "dist");
  mkdirSync(join(dist, "assets"), { recursive: true });

  for (const file of VITE_SHELL_FILES) {
    writeFileSync(join(dist, file), VALID_ECOSYSTEM);
  }

  writeFileSync(join(dist, "assets", "ecosystem.js"), "console.log('ecosystem');");
  return projectRoot;
}

describe("viteShellStaging", () => {
  it("stages and restores Vite shells", () => {
    const projectRoot = createProjectRoot();
    try {
      stageViteShells(projectRoot);
      assert.equal(existsSync(join(projectRoot, ".vite-shell-staging", "ecosystem.html")), true);

      writeFileSync(join(projectRoot, "dist", "ecosystem.html"), STATIC_OVERVIEW);
      restoreViteShells(projectRoot);

      const restored = readFileSync(join(projectRoot, "dist", "ecosystem.html"), "utf8");
      assert.match(restored, /Ecosystem Entry/);
      assert.equal(existsSync(join(projectRoot, ".vite-shell-staging")), false);
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it("fails when a source shell is missing before staging", () => {
    const projectRoot = createProjectRoot();
    try {
      rmSync(join(projectRoot, "dist", "ecosystem.html"));
      assert.throws(() => stageViteShells(projectRoot), /vite shell missing before staging/);
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it("fails when a staged shell is missing before restore", () => {
    const projectRoot = createProjectRoot();
    try {
      stageViteShells(projectRoot);
      rmSync(join(projectRoot, ".vite-shell-staging", "cockpit.html"));
      assert.throws(() => restoreViteShells(projectRoot), /staged vite shell missing/);
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it("restores after storefront overwrite", () => {
    const projectRoot = createProjectRoot();
    try {
      stageViteShells(projectRoot);

      for (const file of VITE_SHELL_FILES) {
        writeFileSync(join(projectRoot, "dist", file), STATIC_OVERVIEW);
      }
      writeFileSync(join(projectRoot, "dist", "assets", "ecosystem.js"), "console.log('overwritten');");

      restoreViteShells(projectRoot);

      const html = readFileSync(join(projectRoot, "dist", "ecosystem.html"), "utf8");
      assert.match(html, /Ecosystem Entry/);
      assert.doesNotMatch(html, /Ecosystem Overview/);
      assert.equal(readFileSync(join(projectRoot, "dist", "assets", "ecosystem.js"), "utf8"), "console.log('ecosystem');");
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it("supports repeated stage and restore invocations", () => {
    const projectRoot = createProjectRoot();
    try {
      stageViteShells(projectRoot);
      restoreViteShells(projectRoot);
      stageViteShells(projectRoot);
      restoreViteShells(projectRoot);

      const html = readFileSync(join(projectRoot, "dist", "ecosystem.html"), "utf8");
      assert.match(html, /Ecosystem Entry/);
      assert.equal(existsSync(join(projectRoot, ".vite-shell-staging")), false);
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it("cleans staging directory after restore", () => {
    const projectRoot = createProjectRoot();
    try {
      stageViteShells(projectRoot);
      assert.equal(existsSync(join(projectRoot, ".vite-shell-staging")), true);
      restoreViteShells(projectRoot);
      assert.equal(existsSync(join(projectRoot, ".vite-shell-staging")), false);
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});

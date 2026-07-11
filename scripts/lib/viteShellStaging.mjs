import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const VITE_SHELL_FILES = ["ecosystem.html", "cockpit.html", "auth.html", "council.html"];

function resolvePaths(projectRoot) {
  const root = projectRoot ?? join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  return {
    root,
    dist: join(root, "dist"),
    stagingDir: join(root, ".vite-shell-staging"),
  };
}

export function stageViteShells(projectRoot) {
  const { dist, stagingDir } = resolvePaths(projectRoot);
  rmSync(stagingDir, { recursive: true, force: true });
  mkdirSync(stagingDir, { recursive: true });

  for (const file of VITE_SHELL_FILES) {
    const source = join(dist, file);
    if (!existsSync(source)) {
      throw new Error(`vite shell missing before staging: ${source}`);
    }
    cpSync(source, join(stagingDir, file));
  }

  const assetsDir = join(dist, "assets");
  if (existsSync(assetsDir)) {
    cpSync(assetsDir, join(stagingDir, "assets"), { recursive: true });
  }
}

export function restoreViteShells(projectRoot) {
  const { dist, stagingDir } = resolvePaths(projectRoot);

  if (!existsSync(stagingDir)) {
    throw new Error("vite shell staging missing — call stageViteShells after vite build");
  }

  for (const file of VITE_SHELL_FILES) {
    const staged = join(stagingDir, file);
    if (!existsSync(staged)) {
      throw new Error(`staged vite shell missing: ${staged}`);
    }
    cpSync(staged, join(dist, file));
  }

  const stagedAssets = join(stagingDir, "assets");
  if (existsSync(stagedAssets)) {
    mkdirSync(join(dist, "assets"), { recursive: true });
    cpSync(stagedAssets, join(dist, "assets"), { recursive: true });
  }

  rmSync(stagingDir, { recursive: true, force: true });
}

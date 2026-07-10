import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEV_API_PROXY_TARGET =
  process.env.VITE_DEV_API_PROXY_TARGET ?? "https://msh-ops-os-harness.sogellagepul.workers.dev";

function resolveCommitSha(): string {
  if (process.env.GIT_COMMIT_SHA?.trim()) return process.env.GIT_COMMIT_SHA.trim();
  if (process.env.GITHUB_SHA?.trim()) return process.env.GITHUB_SHA.trim();
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const pkg = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf8"));

export default defineConfig({
  define: {
    __BUILD_COMMIT__: JSON.stringify(resolveCommitSha()),
    __BUILD_TIME__: JSON.stringify(process.env.BUILD_TIMESTAMP?.trim() || new Date().toISOString()),
    __APP_VERSION__: JSON.stringify(pkg.version),
  },  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: DEV_API_PROXY_TARGET,
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      input: {
        ecosystem: resolve(__dirname, "ecosystem.html"),
        cockpit: resolve(__dirname, "cockpit.html"),
        auth: resolve(__dirname, "auth.html"),
        council: resolve(__dirname, "council.html"),
      },
    },
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

/**
 * Dedicated Vite config for the Pearl SHOWCASES ONLY (substrate + Living Layer).
 *
 * Isolated from the production pipeline: `npm run build` (scripts/build.mjs)
 * does NOT reference this config, so the production surfaces and their assembly
 * are untouched. This builds the bounded previews to `dist-pearl/` for local
 * browser verification:
 *   pearl-preview.html         — static substrate (no motion)
 *   pearl-living-preview.html  — Living Layer (decorative motion over substrate)
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist-pearl",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        pearl: resolve(__dirname, "pearl-preview.html"),
        "pearl-living": resolve(__dirname, "pearl-living-preview.html"),
      },
    },
  },
});

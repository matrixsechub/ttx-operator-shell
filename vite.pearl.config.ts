import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

/**
 * Dedicated Vite config for the Pearl substrate SHOWCASE ONLY.
 *
 * Isolated from the production pipeline: `npm run build` (scripts/build.mjs)
 * does NOT reference this config, so the production surfaces and their assembly
 * are untouched. This builds the bounded preview to `dist-pearl/` for local
 * browser verification.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist-pearl",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: { pearl: resolve(__dirname, "pearl-preview.html") },
    },
  },
});

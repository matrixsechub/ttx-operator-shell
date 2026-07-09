import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Local dev only: proxy /api to the engine so `npm run dev` works without
// running the Worker. Production routing is handled by worker/index.ts.
const DEV_API_PROXY_TARGET =
  process.env.VITE_DEV_API_PROXY_TARGET ?? "https://ttx-operator-shell.sogellagepul.workers.dev";

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
  },
});

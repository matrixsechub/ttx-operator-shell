import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * Vitest config — component/UI tests for the Pearl substrate primitives.
 * Scoped to src/pearl-theme so it does not touch the existing `node:test`
 * suite (which remains the authority for worker/logic tests via `npm test`).
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/pearl-theme/**/*.test.{ts,tsx}"],
    setupFiles: ["src/pearl-theme/__tests__/setup.ts"],
    css: false,
  },
});

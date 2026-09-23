import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      // Route modules import "server-only" to keep them out of client bundles. There is no
      // bundle split in tests, so resolve it to the no-op shim Next substitutes under its
      // react-server condition at build time.
      "server-only": resolve(__dirname, "./node_modules/server-only/empty.js"),
    },
  },
  test: {
    environment: "node",
    // The booking tests share one throwaway SQLite file (prisma/test.db) that a test file
    // recreates in beforeAll and disconnects from in afterAll. Run files sequentially:
    // with parallel workers one file deletes the DB while another process still has it
    // open, and on Windows the open handle keeps the table data alive so the recreate
    // fails with "table already exists".
    fileParallelism: false,
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e"],
    coverage: { reporter: ["text", "json-summary"] },
  },
});
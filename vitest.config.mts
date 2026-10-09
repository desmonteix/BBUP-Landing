import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    // .tsx included up front so the first component test someone writes
    // actually runs instead of being silently skipped.
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      // `server-only` is a marker package: its main entry throws on import so
      // that bundling a server module into a client bundle fails loudly. Next
      // swaps it for the package's own empty.js via the `react-server` export
      // condition; Vitest does not apply that condition, so point at the same
      // empty module directly. Without this, importing pricing.ts from a test
      // throws before a single assertion runs.
      "server-only": path.resolve(import.meta.dirname, "./node_modules/server-only/empty.js"),
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});

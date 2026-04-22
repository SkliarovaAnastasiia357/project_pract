import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/backend/**/*.test.ts"],
    exclude: ["tests/frontend/**"],
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 60_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/backend/**/*.ts"],
      exclude: ["src/backend/**/*.test.ts", "src/backend/index.ts"],
      thresholds: { statements: 80, branches: 75, functions: 80, lines: 80 },
    },
  },
});

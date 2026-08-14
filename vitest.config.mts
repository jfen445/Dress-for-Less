import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Two projects rather than one, because the suites want different globals:
// route/logic tests run in node (no DOM, and importing jsdom would hide a
// server-side dependency on `window`), component tests need jsdom.
//
// tests/e2e is Playwright's and is deliberately matched by neither include.
//
// resolve.tsconfigPaths handles the `@/*` → `./src/*` alias from tsconfig.json
// natively; no plugin needed.
export default defineConfig({
  test: {
    projects: [
      {
        resolve: { tsconfigPaths: true },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts", "tests/routes/**/*.test.ts"],
        },
      },
      {
        plugins: [react()],
        resolve: { tsconfigPaths: true },
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["tests/components/**/*.test.tsx"],
          setupFiles: ["tests/setup/dom.ts"],
        },
      },
    ],
  },
});

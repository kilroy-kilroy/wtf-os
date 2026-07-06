import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Scoped to the Wah-Wah Detector pure-function suites. The `@` alias mirrors
// tsconfig (`@/*` -> web root). Test files are excluded from tsconfig/next build;
// vitest transpiles them independently.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    include: ["lib/wah-wah/**/*.test.ts", "lib/contracts/**/*.test.ts", "lib/slack.test.ts", "lib/discovery-target.test.ts", "lib/client-documents/**/*.test.ts", "lib/case-study-lab/**/*.test.ts", "components/case-study-lab/**/*.test.ts", "lib/robot-tim/**/*.test.ts"],
    environment: "node",
  },
});

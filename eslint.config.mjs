import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    // Existing browser hydration/data-loading effects are valid React behavior.
    // Keep this performance advisory visible without a site-wide UI refactor.
    rules: { "react-hooks/set-state-in-effect": "warn" },
  },
  {
    files: ["**/*.cjs"],
    // These Node entry points intentionally use CommonJS, including the tsx shim.
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  globalIgnores([
    ".next/**", "out/**", "build/**", "next-env.d.ts", "node_modules/**",
    "artifacts/**", "playwright-report/**", "test-results/**", "coverage/**",
    "pics/**", ".private/**",
  ]),
]);

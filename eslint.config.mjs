import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Non-Next runtimes (linted separately if needed):
    "game-server/**",
    "apps/host-desktop/**",
    // Generated desktop artifacts:
    "apps/host-desktop/.bundle/**",
    "apps/host-desktop/dist/**",
    "apps/host-desktop/out/**",
    // Local temp logs:
    ".tmp-devserver*.log",
  ]),
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
    },
  },
]);

export default eslintConfig;

import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist/**", ".vinext/**", ".wrangler/**", "scripts/**"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...reactHooks.configs.flat["recommended-latest"].rules,
      ...jsxA11y.flatConfigs.recommended.rules,
    },
  },
  {
    // The simulation and rules layer must stay engine-agnostic so it stays
    // unit-testable and can be reasoned about without a running game.
    files: ["src/game/systems/**/*.ts", "src/game/state/**/*.ts", "src/game/data/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "phaser",
              message: "systems/state/data must be pure TypeScript — rendering lives in scenes/entities.",
            },
          ],
        },
      ],
    },
  },
]);

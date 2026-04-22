import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import security from "eslint-plugin-security";

export default [
  {
    files: ["src/backend/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2022, sourceType: "module" },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      security,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...security.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "security/detect-object-injection": "off",
      "no-console": "off",
    },
  },
  {
    ignores: ["dist/", "node_modules/", "coverage/", "tests/frontend/**", "**/*.config.*"],
  },
];

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "src-tauri/target", "src-tauri/gen", "release"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true }
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "no-restricted-globals": [
        "error",
        { name: "confirm", message: "Use the in-app ConfirmDialog instead of native dialogs for WKWebView compatibility." },
        { name: "prompt", message: "Use the in-app ConfirmDialog prompt mode instead of native dialogs for WKWebView compatibility." },
        { name: "alert", message: "Use app feedback or ConfirmDialog instead of native dialogs for WKWebView compatibility." },
      ],
      "no-restricted-properties": [
        "error",
        { object: "window", property: "confirm", message: "Use the in-app ConfirmDialog instead of native dialogs for WKWebView compatibility." },
        { object: "window", property: "prompt", message: "Use the in-app ConfirmDialog prompt mode instead of native dialogs for WKWebView compatibility." },
        { object: "window", property: "alert", message: "Use app feedback or ConfirmDialog instead of native dialogs for WKWebView compatibility." },
      ],
    },
  }
);

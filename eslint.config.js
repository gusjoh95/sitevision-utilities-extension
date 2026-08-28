import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: {
        ...globals.browser,
        chrome: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
      "no-restricted-syntax": [
        "error",
        {
          "selector": "ImportDeclaration[source.value=/^\\.+(\\/\\.\\.+)*\\/.*(?<!\\.js)$/]",
          "message": "Relative imports must include .js extension"
        },
        {
          "selector": "ImportDeclaration[source.value=/\\/api\\/(?!api\\.js$)/]",
          "message": "Import API implementations through api/api.js"
        }
      ]
    }
  }
]);
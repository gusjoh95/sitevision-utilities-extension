import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';
import htmlPlugin from '@html-eslint/eslint-plugin';
import htmlParser from '@html-eslint/parser';
import { htmlRules } from './eslint/index.js';
export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: {
      globals: {
        ...globals.browser,
        chrome: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportDeclaration[source.value=/^\\.+(\\/\\.\\.+)*\\/.*(?<!\\.js)$/]',
          message: 'Relative imports must include .js extension',
        },
        {
          selector: 'ImportDeclaration[source.value=/\\/api\\/(?!index\\.js$)/]',
          message: 'Import API implementations through api/index.js',
        },
        {
          selector:
            "CallExpression[callee.property.name='add'][callee.object.property.name='classList'] > Literal[value='tooltipped']",
          message:
            "Adding 'tooltipped' class via classList. Ensure aria-label is also set on the element.",
        },
      ],
    },
  },

  /* HTML Linting Block */
  {
    files: ['**/*.html'],
    plugins: {
      '@html-eslint': htmlPlugin,
      custom: htmlRules,
    },
    languageOptions: {
      parser: htmlParser, // Required by custom rules that rely on the HTML AST
    },
    rules: {
      '@html-eslint/no-duplicate-class': 'error',
      ...Object.fromEntries(
        Object.keys(htmlRules.rules).map((rule) => [`custom/${rule}`, 'error'])
      ),
    },
  },
]);

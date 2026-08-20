const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const prettierPlugin = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');
const noOnlyOrSkipTests = require('eslint-plugin-no-only-or-skip-tests');

module.exports = [
  {
    files: ['**/*.ts'],

    ignores: ['node_modules/**', 'dist/**', 'coverage/**'],

    languageOptions: {
      parser: tsParser,
      parserOptions: {
        tsconfigRootDir: __dirname,
        sourceType: 'module',
      },
      globals: {
        ...require('globals').node,
        ...require('globals').jest,
      },
    },

    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
      'no-only-or-skip-tests': noOnlyOrSkipTests,
    },

    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...prettierConfig.rules,

      'prettier/prettier': 'error',

      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',

      'no-console': ['error', { allow: ['warn'] }],

      'no-only-or-skip-tests/no-only-tests': 'error',
      'no-only-or-skip-tests/no-skip-tests': 'error',
    },
  },
];

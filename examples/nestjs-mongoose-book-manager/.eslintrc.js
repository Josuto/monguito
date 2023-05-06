module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    // project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: "module"
  },
  plugins: ["@typescript-eslint/eslint-plugin", "no-only-or-skip-tests"],
  extends: [
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended"
  ],
  root: true,
  env: {
    node: true,
    jest: true
  },
  ignorePatterns: [".eslintrc.js"],
  rules: {
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "no-console": "error",
    "no-only-or-skip-tests/no-only-tests": "error",
    "no-only-or-skip-tests/no-skip-tests": "error"
  }
};

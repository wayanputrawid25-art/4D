/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:@typescript-eslint/strict',
    'prettier',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports' },
    ],
    '@typescript-eslint/no-misused-promises': [
      'error',
      { checksVoidReturn: { attributes: false } },
    ],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'eqeqeq': 'error',
    'no-throw-literal': 'error',
  },
  ignorePatterns: [
    'node_modules',
    'dist',
    '.turbo',
    'coverage',
    '*.config.js',
    '*.config.ts',
  ],
};

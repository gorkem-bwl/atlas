// Atlas server ESLint config.
//
// Smaller than the client ruleset — no JSX, no design system. Focus:
//   - Catch unused imports/vars
//   - Discourage stray console.log (use logger)
//   - Flag the common tenant-scope footgun (TODO: custom rule)
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    plugins: { '@typescript-eslint': tseslint },
    linterOptions: { reportUnusedDisableDirectives: false },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // Prefer the pino logger over console.*; it's structured and
      // configurable per-env. `console.warn` and `console.error` are
      // fine in build scripts and tests.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      // Build scripts legitimately use console.log.
      'src/openapi/build.ts',
    ],
  },
];

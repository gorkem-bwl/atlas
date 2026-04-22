// Atlas client ESLint config.
//
// Goal: enforce the hard rules from CLAUDE.md and
// docs/architecture-for-agents.md at lint time. Keep the ruleset small
// and opinionated — every rule here should have caught a real bug or
// prevented a real footgun.
//
// Severity policy:
//   - ERROR: would break in production or is a security issue.
//   - WARN: the convention, but the existing codebase has pre-existing
//           violations we're not rewriting wholesale. New code should
//           be clean; the warning count shouldn't grow over time.
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';

const RESTRICTIONS = [
  // UI primitives — use shared components, not raw HTML elements.
  {
    selector: "JSXOpeningElement[name.name='button']",
    message: "Use <Button> or <IconButton> from components/ui/ instead of <button>.",
  },
  {
    selector: "JSXOpeningElement[name.name='input']",
    message: "Use <Input> from components/ui/ instead of <input>.",
  },
  {
    selector: "JSXOpeningElement[name.name='select']",
    message: "Use <Select> from components/ui/ instead of <select>.",
  },
  {
    selector: "JSXOpeningElement[name.name='textarea']",
    message: "Use <Textarea> from components/ui/ instead of <textarea>.",
  },
  // Color literals inside JSX style attributes — use CSS vars.
  // Covers hex (#abc, #abcdef, #abcdef80), rgb/rgba, hsl/hsla, oklch.
  // Named colors (e.g. 'red', 'white') aren't caught — accept the gap;
  // they're rare and grep-able.
  {
    selector: "JSXAttribute[name.name='style'] Literal[value=/^(#[0-9a-fA-F]{3,8}|rgba?\\(|hsla?\\(|oklch\\()/]",
    message: "Use CSS variables from styles/theme.css (var(--color-*)) instead of color literals.",
  },
  // Native modal dialogs — always wrong in a themed app.
  {
    selector: "CallExpression[callee.object.name='window'][callee.property.name='confirm']",
    message: "Use <ConfirmDialog> from components/ui/ instead of window.confirm().",
  },
  {
    selector: "CallExpression[callee.object.name='window'][callee.property.name='alert']",
    message: "Use a toast or <ConfirmDialog> instead of window.alert().",
  },
  {
    selector: "CallExpression[callee.name='confirm']:not([callee.object])",
    message: "Use <ConfirmDialog> from components/ui/ instead of confirm().",
  },
  {
    selector: "CallExpression[callee.name='alert']:not([callee.object])",
    message: "Use a toast or <ConfirmDialog> instead of alert().",
  },
];

export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
    },
    plugins: { '@typescript-eslint': tseslint, 'react-hooks': reactHooks },
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // All design-system + correctness rules as warnings. The codebase
      // has ~180 pre-existing violations; we warn rather than error so
      // CI can stay green while new code is held to a cleaner standard.
      // Policy: warnings shouldn't grow. Eliminate them opportunistically
      // as files are touched.
      'no-restricted-syntax': ['warn', ...RESTRICTIONS],
      // TODO: there are pre-existing hook-order violations in the
      // codebase (dock-pet, permissions-view, home.tsx). Fix them and
      // then flip this to 'error'. Each one is a potential user-facing
      // "Rendered more hooks than during the previous render" crash.
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'src/types/api.generated.ts',
      'legacy/**',
    ],
  },
];

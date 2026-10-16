import type { UserConfig } from 'vite-plus';

type LintConfig = NonNullable<UserConfig['lint']>;

const tests = ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'];
const webSource = ['**/apps/web/src/**'];
const webTests = ['**/apps/web/src/**/*.test.ts', '**/apps/web/src/**/*.test.tsx'];

// Lint policy for `vp lint` / `vp check` (Oxlint). Biome rule names are noted where they differ.
export const lint = {
  plugins: [
    'eslint',
    'typescript',
    'unicorn',
    'oxc',
    'react',
    'jsx-a11y',
    'import',
    'node',
    'vitest'
  ],
  jsPlugins: [
    { name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' },
    { name: 'groam', specifier: './tooling/oxc-config/plugin/index.ts' }
  ],
  categories: { correctness: 'error' },
  // Type checking stays with each package's `tsc` (`bun run typecheck`).
  options: { typeAware: true },
  ignorePatterns: [
    '**/.astro/**',
    '**/dist/**',
    '**/_generated/**',
    '**/generated.ts',
    '**/routeTree.gen.ts',
    '**/vendor/**',
    '.claude/**'
  ],
  rules: {
    'vite-plus/prefer-vite-plus-imports': 'error',

    // correctness
    'eslint/no-unused-vars': [
      'error',
      { args: 'all', argsIgnorePattern: '^_', caughtErrors: 'none', varsIgnorePattern: '^_' }
    ],
    'react/rules-of-hooks': 'error',
    // Correctness rules without a Biome counterpart; candidates to adopt separately.
    'jsx-a11y/click-events-have-key-events': 'off',
    'jsx-a11y/prefer-tag-over-role': 'off',
    'react/immutability': 'off',
    'react/incompatible-library': 'off',
    'react/no-did-update-set-state': 'off',
    'react/purity': 'off',
    'react/refs': 'off',
    'react/set-state-in-effect': 'off',
    'react/static-components': 'off',
    'typescript/await-thenable': 'off',
    'typescript/no-base-to-string': 'off',
    'typescript/no-duplicate-type-constituents': 'off',
    'typescript/no-floating-promises': 'off',
    'typescript/no-meaningless-void-operator': 'off',
    'typescript/no-misused-spread': 'off',
    'typescript/no-redundant-type-constituents': 'off',
    'typescript/require-array-sort-compare': 'off',
    'typescript/restrict-template-expressions': 'off',
    'typescript/unbound-method': 'off',
    'unicorn/no-new-array': 'off',
    'vitest/no-conditional-expect': 'off',
    'vitest/require-mock-type-parameters': 'off',
    'vitest/require-to-throw-message': 'off',

    // suspicious
    'react/no-array-index-key': 'off',
    'eslint/no-console': ['error', { allow: ['error', 'warn', 'info'] }],
    'typescript/no-explicit-any': 'error',
    'vitest/no-focused-tests': 'error',
    'vitest/no-disabled-tests': 'error',
    'jest/no-export': 'error',
    'vitest/no-duplicate-hooks': 'error',

    // complexity
    'groam/cognitive-complexity': ['error', { maxAllowedComplexity: 15 }],
    'vitest/max-nested-describe': ['error', { max: 5 }],
    'react/jsx-no-useless-fragment': ['error', { allowExpressions: true }],
    'eslint/prefer-arrow-callback': ['error', { allowNamedFunctions: true }],
    'eslint/max-params': ['error', { max: 4 }],
    'typescript/prefer-optional-chain': 'error',
    'unicorn/no-static-only-class': 'error',

    // performance
    'oxc/no-accumulating-spread': 'error',
    'groam/no-delete': 'error',
    'groam/no-re-export-all': 'error',

    // style
    'import/no-commonjs': 'error',
    'typescript/no-non-null-assertion': 'error',
    'eslint/no-param-reassign': 'error',
    'node/no-process-env': 'error',
    'eslint/prefer-const': ['error', { ignoreReadBeforeAssign: true }],
    'typescript/consistent-type-exports': 'error',
    'typescript/consistent-type-imports': ['error', { disallowTypeAnnotations: false }],
    'unicorn/filename-case': ['error', { case: 'kebabCase' }],
    'typescript/prefer-for-of': 'error',
    'eslint/no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@groam/ui',
            message:
              'Import UI through @groam/ui/components/*, @groam/ui/hooks/*, @groam/ui/lib/*, or @groam/ui/styles.'
          }
        ],
        patterns: [
          {
            group: ['@halo', '@halo/**'],
            message: 'Use @groam/* package names instead of leftover Halo package aliases.'
          }
        ]
      }
    ],
    'unicorn/prefer-node-protocol': 'error',
    'react/self-closing-comp': 'error',
    'unicorn/throw-new-error': 'error',

    // a11y
    'jsx-a11y/no-autofocus': ['error', { ignoreNonDOM: true }],
    'groam/use-semantic-elements': 'error'
  },
  overrides: [
    {
      files: ['apps/web/src/routes/**'],
      rules: { 'unicorn/filename-case': 'off' }
    },
    {
      files: ['tooling/**'],
      rules: { 'eslint/no-console': 'off', 'node/no-process-env': 'off' }
    },
    {
      files: ['packages/env/**'],
      rules: { 'node/no-process-env': 'off' }
    },
    {
      files: ['**/*.tsx'],
      excludeFiles: tests,
      rules: {
        'groam/max-lines-per-function': ['error', { maxLines: 250, skipIifes: true }]
      }
    },
    {
      files: ['apps/web/src/features/**/*.ts', 'apps/web/src/features/**/*.tsx'],
      excludeFiles: tests,
      rules: {
        'groam/max-lines': ['error', { maxLines: 300 }]
      }
    },
    {
      files: tests,
      rules: { 'eslint/no-console': 'off', 'typescript/no-non-null-assertion': 'off' }
    },

    // Groam guardrails, scoped like the former Grit plugins.
    {
      files: webSource,
      excludeFiles: ['**/apps/web/src/types/**', '**/apps/web/src/routeTree.gen.ts', ...webTests],
      rules: { 'groam/no-local-type-definitions': 'error' }
    },
    {
      files: webSource,
      excludeFiles: webTests,
      rules: {
        'groam/no-direct-sonner-imports': 'error',
        'groam/no-direct-web-storage': 'error',
        'groam/no-raw-internal-anchors': 'error',
        'groam/no-raw-test-ids': 'error',
        'groam/shell-columns': 'error'
      }
    },
    {
      files: ['**/apps/web/src/features/trips/trip-detail/trip-page-shell.tsx'],
      rules: { 'groam/planning-page-body': 'error' }
    },
    {
      files: ['**/apps/web/src/features/trips/**', '**/apps/web/src/features/ideas/**'],
      excludeFiles: ['**/apps/web/src/features/trips/trip-detail/trip-page-shell.tsx', ...webTests],
      rules: { 'groam/no-nested-planning-page-body': 'error' }
    },
    {
      files: ['**/packages/ui/src/**', ...webSource],
      excludeFiles: ['**/*.test.ts', '**/*.test.tsx'],
      rules: { 'groam/scoped-descendant-variants': 'error' }
    },
    {
      files: webSource,
      excludeFiles: [
        '**/apps/web/src/features/workspace/workspace-shell/use-confirm-dialog.tsx',
        ...webTests
      ],
      rules: { 'groam/no-native-browser-dialogs': 'error' }
    },
    {
      files: ['**/apps/web/src/features/**'],
      excludeFiles: ['**/apps/web/src/features/**/hooks/**', ...webTests],
      rules: { 'groam/convex-hooks-in-hooks': 'error' }
    },
    {
      files: ['**/apps/web/src/**/*.tsx'],
      excludeFiles: ['**/apps/web/src/**/*.test.tsx'],
      rules: { 'groam/no-fetch-in-components': 'error' }
    },
    {
      files: ['**/apps/web/src/features/**/*.tsx'],
      excludeFiles: ['**/apps/web/src/features/**/*.test.tsx'],
      rules: { 'groam/no-native-interactive-elements': 'error' }
    },
    {
      files: [
        '**/apps/web/e2e/**',
        '**/tooling/app-actions/src/playwright/**',
        '**/tooling/app-actions/src/vitest/**'
      ],
      rules: { 'groam/no-raw-locator-test-ids': 'error' }
    }
  ]
} satisfies LintConfig;

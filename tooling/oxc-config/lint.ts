import type { UserConfig } from 'vite-plus';
import { patternOverrides } from './plugin/patterns.ts';

type LintConfig = NonNullable<UserConfig['lint']>;

const tests = ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'];
const webSource = ['**/apps/web/src/**'];
const webTests = ['**/apps/web/src/**/*.test.ts', '**/apps/web/src/**/*.test.tsx'];

// Import boundaries. An override replaces `no-restricted-imports` for its files, so each override
// repeats the parent-directory pattern.
const noParentImports = {
  group: ['../*', '../**'],
  message: 'Import through a package alias (#src/*, @/*, @groam/*) instead of a parent directory.'
};
const backendEnvImports = {
  group: ['@groam/env', '@groam/env/**', '!@groam/env/deployment'],
  message:
    'The backend may import only @groam/env/deployment; read Convex values from its generated env.'
};
// Pages compose feature views: features, lib, and the app layout, and @groam
// packages other than UI.
const pageImports = {
  group: [
    '*',
    ...[
      '@groam/ai',
      '@groam/auth',
      '@groam/backend',
      '@groam/brand',
      '@groam/env',
      '@groam/icons'
    ].flatMap((name) => [`!${name}`, `!${name}/**`]),
    '!@/features/**',
    '!@/lib/**',
    '!@/app-layout',
    // The page's feature view registers the assistant's screen context, never the page itself.
    '@groam/ai/ui/context/**'
  ],
  message: 'Web pages only compose feature views; move other imports into a feature.'
};

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
    '**/vendor/**',
    '.claude/**',
    '.agents/**',
    '.codex/**'
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
    'typescript/prefer-for-of': 'error',
    'eslint/no-restricted-imports': ['error', { patterns: [noParentImports] }],
    'unicorn/prefer-node-protocol': 'error',
    'react/self-closing-comp': 'error',
    'unicorn/throw-new-error': 'error',

    // a11y
    'jsx-a11y/no-autofocus': ['error', { ignoreNonDOM: true }],
    'groam/use-semantic-elements': 'error'
  },
  overrides: [
    {
      files: ['**/packages/backend/**'],
      rules: {
        'eslint/no-restricted-imports': [
          'error',
          { patterns: [noParentImports, backendEnvImports] }
        ]
      }
    },
    {
      files: ['**/apps/web/pages/**'],
      rules: {
        'eslint/no-restricted-imports': ['error', { patterns: [noParentImports, pageImports] }]
      }
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
      files: ['**/apps/web/src/**', '**/apps/web/pages/**', '**/packages/ai/src/ui/**'],
      excludeFiles: tests,
      rules: { 'groam/no-duplicate-issue-form': 'error' }
    },
    {
      files: ['**/apps/**', '**/packages/**'],
      excludeFiles: ['**/packages/icons/**'],
      rules: { 'groam/no-raw-icons': 'error' }
    },
    {
      // Brand artwork is owned by the brand package, rather than the icon catalog.
      files: ['**/packages/brand/**'],
      rules: { 'groam/no-raw-icons': ['error', { allowSvg: true }] }
    },
    {
      files: webSource,
      excludeFiles: webTests,
      rules: { 'groam/no-raw-internal-anchors': 'error', 'groam/shell-columns': 'error' }
    },
    {
      // Form guardrails (the build-form skill).
      files: [
        '**/apps/web/src/features/**/*.ts',
        '**/apps/web/src/features/**/*.tsx',
        '**/packages/ai/src/ui/**/*.ts',
        '**/packages/ai/src/ui/**/*.tsx'
      ],
      excludeFiles: tests,
      rules: {
        'groam/no-form-in-raw-dialog': 'error',
        'groam/no-hand-rolled-pending': 'error',
        'groam/no-manual-draft-reset': 'error',
        'groam/no-optional-copy': 'error',
        'groam/no-pending-copy': 'error',
        'groam/no-spinner-in-button': 'error'
      }
    },
    {
      // Every workspace page forwards its screen context to the assistant, once (the
      // register-agent-screen-context skill).
      files: ['**/apps/web/pages/**/*.tsx'],
      excludeFiles: ['**/layout.tsx', ...tests],
      rules: { 'groam/page-renders-view': 'error' }
    },
    {
      files: ['**/apps/web/src/features/**/*-view.tsx'],
      excludeFiles: tests,
      rules: { 'groam/view-registers-agent-context': 'error' }
    },
    {
      files: [
        '**/apps/web/src/**/*.ts',
        '**/apps/web/src/**/*.tsx',
        '**/apps/web/pages/**/*.ts',
        '**/apps/web/pages/**/*.tsx'
      ],
      excludeFiles: tests,
      rules: { 'groam/agent-context-owner': 'error' }
    },
    {
      files: ['**/apps/web/src/features/trips/trip-detail/trip-page-shell.tsx'],
      rules: { 'groam/planning-page-body': 'error' }
    },
    // Pattern rules carry their own scope (plugin/patterns/*.json).
    ...patternOverrides
  ]
} satisfies LintConfig;

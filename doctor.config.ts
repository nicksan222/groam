import { defineConfig } from 'react-doctor/api';

export default defineConfig({
  // Fallow owns dead-code and dependency analysis for this workspace.
  deadCode: false,
  supplyChain: { enabled: false },
  rules: {
    // Biome owns hooks and accessibility. File-per-component lives in
    // tooling/quality/conventions.ts; no-giant-component stays on as the
    // per-function size backstop.
    'react-doctor/exhaustive-deps': 'off',
    'react-doctor/rules-of-hooks': 'off',
    'react-doctor/button-has-type': 'off',
    'react-doctor/role-has-required-aria-props': 'off',
    'react-doctor/prefer-tag-over-role': 'off',
    'react-doctor/no-static-element-interactions': 'off',
    'react-doctor/no-noninteractive-element-interactions': 'off'
  },
  ignore: {
    files: [
      '**/.astro/**',
      '**/.turbo/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/_generated/**',
      '**/node_modules/**'
    ]
  }
});

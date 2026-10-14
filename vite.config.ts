import { defineConfig } from 'vite-plus';
import { fmt } from './tooling/oxc-config/fmt.ts';
import { lint } from './tooling/oxc-config/lint.ts';

export default defineConfig({
  fmt,
  lint,
  // Root `vp test` runs tooling/quality; its lint fixtures spawn `vp lint` per case.
  test: { testTimeout: 60_000 },
  staged: {
    '*': 'vp check --fix --no-error-on-unmatched-pattern'
  }
});

import { defineConfig } from 'vite-plus';
import { fmt } from './tooling/oxc-config/fmt.ts';
import { lint } from './tooling/oxc-config/lint.ts';
import { setupFiles } from './tooling/vitest-config/src/setup-files.ts';

export default defineConfig({
  fmt,
  lint,
  // Root `vp test` runs tooling/quality and tooling/oxc-config; lint fixtures spawn `vp lint` per case.
  test: { setupFiles: [setupFiles.consoleGuard], testTimeout: 60_000 },
  staged: {
    '*': 'vp check --fix --no-error-on-unmatched-pattern'
  }
});

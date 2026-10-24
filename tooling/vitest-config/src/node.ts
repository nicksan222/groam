import { setupFiles } from '@groam/vitest-config/setup-files';
import { defineConfig } from 'vite-plus';

export const nodeVitestConfig = defineConfig({
  test: { setupFiles: [setupFiles.consoleGuard] }
});

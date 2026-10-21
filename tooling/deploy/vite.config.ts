import { defineConfig } from 'vite-plus';

// Unit tests only; e2e/ runs against a deployed environment through `test:deployed`.
export default defineConfig({
  test: { include: ['src/**/*.test.ts'] }
});

import { createWebVitestConfig } from '@groam/vitest-config/web';

export default createWebVitestConfig(import.meta.dirname, {
  browser: {
    instances: [
      { include: ['src/**/*.test.tsx'], name: 'views', setupFiles: ['./src/browser-setup.ts'] }
    ]
  }
});

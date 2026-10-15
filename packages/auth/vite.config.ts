import { createWebVitestConfig } from '@groam/vitest-config/web';

export default createWebVitestConfig(import.meta.dirname, {
  // The browser client keeps its session in real browser storage.
  browser: { instances: [{ include: ['src/browser-client-factory.test.ts'], name: 'browser' }] }
});

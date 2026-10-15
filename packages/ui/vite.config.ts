import { createWebVitestConfig } from '@groam/vitest-config/web';

export default createWebVitestConfig(import.meta.dirname, {
  browser: {
    instances: [
      {
        include: ['src/**/*.test.tsx', 'src/hooks/**/*.test.ts'],
        name: 'views',
        setupFiles: ['./src/browser-setup.ts']
      }
    ]
  }
});
